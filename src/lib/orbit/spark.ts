// src/lib/orbit/spark.ts
//
// Spark-flow logic: detect spontaneous-event intent in a member message,
// create an interest gauge, and auto-create an event when threshold is met.
//
// Architecture: called synchronously from the send-message server action.
// The optimistic member message is already visible; the slight action latency
// (~1-2s for the Anthropic call) is acceptable because the member sees their
// message immediately and Orbit's gauge appears on the subsequent revalidation.
//
// Build-notes §5 behavioral rules honored here:
// - Gauge triggers only on spontaneous intent (not RSVPs to existing events)
// - Initiator auto-votes IN (never ask twice)
// - Threshold: 3 IN votes (including initiator)
// - One open gauge per group at a time (skip if one exists)

import { prisma } from "@/lib/prisma"
import { MessageAuthor, GaugeResponse } from "@prisma/client"
import { createMessage } from "@/lib/messages/create"
import { createEvent } from "@/lib/events/create"
import { seedRsvpByUserId } from "@/lib/events/rsvp"
import { RsvpStatus } from "@prisma/client"

// ── Keyword pre-filter ────────────────────────────────────────────────────────
// Run this before calling Anthropic to avoid unnecessary API calls on every
// message. Catches the most common intent patterns with low false-negative rate.

const SPARK_PATTERNS = [
  /who(?:'s|\s+is)?\s+(down|up|in)\s+for/i,
  /anyone\s+(up|down|in)\s+for/i,
  /want\s+to\s+(climb|hike|run|surf|ski|skate|bike|swim|grab|meet|hang)/i,
  /we\s+should\s+(finally|definitely|totally)?\s*(meet|hang|climb|hike|grab|do)/i,
  /who\s+wants\s+to/i,
  /i('m|\s+am)\s+free\s+(this|tonight|today|tomorrow|this\s+week)/i,
  /up\s+for\s+\w+\s+(tonight|today|tomorrow|this\s+week|this\s+weekend|friday|saturday|sunday)/i,
  /let'?s?\s+(do|grab|meet|climb|hike|go)/i,
  /any(?:one|body)\s+(?:want|up|down|free)/i,
]

export function looksLikeSpark(message: string): boolean {
  return SPARK_PATTERNS.some((re) => re.test(message))
}

// ── Open gauge guard ──────────────────────────────────────────────────────────

export async function hasOpenGauge(groupId: string): Promise<boolean> {
  const existing = await prisma.gauge.findFirst({
    where: { groupId, closedAt: null },
  })
  return existing !== null
}

// ── Gauge creation ────────────────────────────────────────────────────────────

export interface GaugeWithCounts {
  id: string
  body: string
  inCount: number
  maybeCount: number
  totalVotes: number
  viewerVote: GaugeResponse | null
  closedAt: Date | null
  eventId: string | null
}

/**
 * Creates an interest gauge in the group's feed.
 *
 * - Writes the Gauge row
 * - Auto-votes IN for the initiator (build-notes §5: never ask twice)
 * - Creates an Orbit MEMBER message with the gaugeId linked
 *
 * Returns the gauge id.
 */
export async function createGauge({
  groupId,
  initiatorId,
  initiatorName,
  activity,
}: {
  groupId: string
  initiatorId: string
  initiatorName: string
  activity: string
}): Promise<string> {
  const body = `Sounds like ${initiatorName} wants to ${activity}! Who's in? I'll set something up if enough people are.`

  const gauge = await prisma.gauge.create({
    data: {
      groupId,
      initiatorId,
      body: activity,
    },
  })

  // Auto-vote the initiator IN
  await prisma.gaugeVote.create({
    data: {
      gaugeId: gauge.id,
      userId: initiatorId,
      response: GaugeResponse.IN,
    },
  })

  // Post Orbit's gauge message in the feed, linked to the gauge
  await createMessage({
    groupId,
    authorType: MessageAuthor.ORBIT,
    authorId: null,
    body,
    gaugeId: gauge.id,
  })

  return gauge.id
}

// ── Vote + threshold check ─────────────────────────────────────────────────────

/**
 * Records a vote on a gauge. If IN votes reach the threshold, creates an
 * event and seeds RSVPs for all IN voters.
 *
 * Returns the gauge id and whether an event was created.
 */
export async function castGaugeVote({
  gaugeId,
  userId,
  response,
}: {
  gaugeId: string
  userId: string
  response: GaugeResponse
}): Promise<{ eventId: string | null }> {
  const gauge = await prisma.gauge.findUnique({
    where: { id: gaugeId },
    include: { votes: true, group: true },
  })

  if (!gauge || gauge.closedAt) {
    return { eventId: null }
  }

  // Upsert the vote (member can change their mind before threshold)
  await prisma.gaugeVote.upsert({
    where: { gaugeId_userId: { gaugeId, userId } },
    create: { gaugeId, userId, response },
    update: { response },
  })

  // Re-fetch votes after upsert
  const allVotes = await prisma.gaugeVote.findMany({ where: { gaugeId } })
  const inVotes = allVotes.filter((v) => v.response === GaugeResponse.IN)

  if (inVotes.length < gauge.threshold) {
    return { eventId: null }
  }

  // Threshold reached — create the event
  // Propose the next occurrence of the group's rhythm, or default to 7 days out
  const startsAt = await proposeStartsAt(gauge.groupId)

  let event
  try {
    event = await createEvent({
      groupId: gauge.groupId,
      title: `${gauge.group.name} ${gauge.body}`,
      startsAt,
      activityLabel: gauge.body,
    })
  } catch (err) {
    // P2002 (duplicate event at that time) — skip silently
    if ((err as { code?: string }).code === "P2002") {
      return { eventId: null }
    }
    throw err
  }

  // Seed RSVPs for all IN voters
  for (const vote of inVotes) {
    try {
      await seedRsvpByUserId({ userId: vote.userId, eventId: event.id, status: RsvpStatus.IN })
    } catch {
      // Non-fatal: continue seeding others
    }
  }

  // Close the gauge
  await prisma.gauge.update({
    where: { id: gaugeId },
    data: { closedAt: new Date(), eventId: event.id },
  })

  // Orbit announces the event
  await createMessage({
    groupId: gauge.groupId,
    authorType: MessageAuthor.ORBIT,
    authorId: null,
    body: `You're on! I've set up a ${gauge.body} event. Check the card above to RSVP.`,
  })

  return { eventId: event.id }
}

// ── Fetch gauge state for UI ──────────────────────────────────────────────────

export async function getGaugeState(
  gaugeId: string,
  viewerId: string | null
): Promise<GaugeWithCounts | null> {
  const gauge = await prisma.gauge.findUnique({
    where: { id: gaugeId },
    include: { votes: true },
  })
  if (!gauge) return null

  const inCount = gauge.votes.filter((v) => v.response === GaugeResponse.IN).length
  const maybeCount = gauge.votes.filter((v) => v.response === GaugeResponse.MAYBE).length
  const viewerVote = viewerId
    ? (gauge.votes.find((v) => v.userId === viewerId)?.response ?? null)
    : null

  return {
    id: gauge.id,
    body: gauge.body,
    inCount,
    maybeCount,
    totalVotes: gauge.votes.length,
    viewerVote,
    closedAt: gauge.closedAt,
    eventId: gauge.eventId,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function proposeStartsAt(groupId: string): Promise<Date> {
  // Try to use the group's rhythm to propose a real next occurrence
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { recurringActivities: true, timeZone: true },
  })

  if (group?.recurringActivities) {
    const { parseRhythm } = await import("./rhythm")
    const { computeNextOccurrence } = await import("./occurrence")
    const rhythm = parseRhythm(group.recurringActivities)
    if (rhythm) {
      return computeNextOccurrence(rhythm, group.timeZone ?? "UTC", new Date())
    }
  }

  // Default: one week from now at 7pm
  const d = new Date()
  d.setDate(d.getDate() + 7)
  d.setUTCHours(19, 0, 0, 0)
  return d
}
