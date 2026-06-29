// src/app/groups/[id]/page.tsx
//
// The real group home (walkthrough frame 06).
//
// Layout:
//   Header: Orbit logo (home button) · group title + chevron (→ group info)
//   Pinned compact event card (soonest upcoming event)
//   Chat feed (own scroll region, --type-body 17px, never shrunk)
//   Pinned message input
//
// Data: single server render before any JS runs.  The event, roster counts,
// and message feed all arrive together from one query pass.
//
// Gauge data: messages with gaugeId have their gauge state fetched and
// attached, so the chat feed can render interest-gauge chips inline.

import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth/current-user"
import { findSoonestUpcomingEvent } from "@/lib/events/upcoming"
import { deriveRoster } from "@/lib/events/roster"
import EventCard from "./EventCard"
import GroupHome from "./GroupHome"
import type { FeedMessage } from "./MessageFeed"

interface Props {
  params: Promise<{ id: string }>
}

export default async function GroupPage({ params }: Props) {
  const { id } = await params

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      memberships: { include: { user: true }, orderBy: { joinedAt: "asc" } },
    },
  })

  if (!group) notFound()

  const viewer = await getCurrentUser()

  // ── Soonest upcoming event + roster ──────────────────────────────────────
  const upcomingEvent = await findSoonestUpcomingEvent(group.id)

  let inCount = 0
  let outCount = 0
  let pendingCount = 0
  let viewerEventStatus = null

  if (upcomingEvent) {
    const rsvps = await prisma.rsvp.findMany({ where: { eventId: upcomingEvent.id } })
    const allMembers = group.memberships.map((m) => m.user)
    const { inMembers, outMembers, pendingMembers, viewerStatus } = deriveRoster(
      allMembers,
      rsvps,
      viewer?.id ?? null
    )
    inCount = inMembers.length
    outCount = outMembers.length
    pendingCount = pendingMembers.length
    viewerEventStatus = viewerStatus
  }

  // ── Message feed with gauge data ──────────────────────────────────────────
  const rawMessages = await prisma.message.findMany({
    where: { groupId: group.id },
    orderBy: { createdAt: "asc" },
    include: { author: true },
  })

  // Fetch gauge states for any gauge messages
  const gaugeIds = rawMessages
    .map((m) => m.gaugeId)
    .filter((id): id is string => id !== null)

  const gauges = gaugeIds.length > 0
    ? await prisma.gauge.findMany({
        where: { id: { in: gaugeIds } },
        include: { votes: true },
      })
    : []

  const gaugeMap = new Map(gauges.map((g) => [g.id, g]))

  const messages: FeedMessage[] = rawMessages.map((msg) => {
    const gauge = msg.gaugeId ? gaugeMap.get(msg.gaugeId) : null
    const viewerVote = gauge && viewer
      ? (gauge.votes.find((v) => v.userId === viewer.id)?.response ?? null)
      : null
    const inCount = gauge ? gauge.votes.filter((v) => v.response === "IN").length : 0
    const maybeCount = gauge ? gauge.votes.filter((v) => v.response === "MAYBE").length : 0

    return {
      id: msg.id,
      authorType: msg.authorType,
      authorId: msg.authorId,
      authorName: msg.author?.name ?? null,
      body: msg.body,
      createdAt: msg.createdAt,
      gauge: gauge
        ? {
            id: gauge.id,
            body: gauge.body,
            inCount,
            maybeCount,
            viewerVote,
            closedAt: gauge.closedAt,
            eventId: gauge.eventId,
          }
        : null,
    }
  })

  return (
    <div
      style={{
        height: "100dvh",
        overflow: "hidden",
        backgroundColor: "var(--surface-page)",
        background: "radial-gradient(ellipse at 50% 0%, rgba(163,230,53,0.03) 0%, transparent 50%), var(--surface-page)",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.875rem 1rem",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
          backgroundColor: "rgba(10,10,10,0.8)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {/* Orbit logo — home button */}
        <div
          aria-label="Orbit"
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            backgroundColor: "var(--color-lime)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.6875rem",
            fontWeight: 700,
            color: "#0a0a0a",
            letterSpacing: "-0.01em",
            boxShadow: "0 0 8px rgba(163,230,53,0.25)",
          }}
        >
          O
        </div>

        {/* Group title + chevron → group info */}
        <Link
          href={`/groups/${group.id}/info`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            textDecoration: "none",
            color: "var(--text-primary)",
          }}
        >
          <span
            style={{
              fontSize: "var(--type-body)",
              fontWeight: 600,
              lineHeight: "var(--leading-tight)",
            }}
          >
            {group.name}
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
            style={{ color: "var(--text-secondary)" }}
          >
            <path
              d="M5 3l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>

        <div style={{ width: 28 }} aria-hidden="true" />
      </header>

      {/* ── Pinned event card ──────────────────────────────────────────── */}
      <div style={{ padding: "0.75rem 1rem 0", flexShrink: 0 }}>
        {upcomingEvent ? (
          <EventCard
            event={{ ...upcomingEvent, timeZone: group.timeZone }}
            groupId={group.id}
            inCount={inCount}
            outCount={outCount}
            pendingCount={pendingCount}
            viewerStatus={viewerEventStatus}
            viewerHasSession={viewer !== null}
          />
        ) : (
          <div
            style={{
              backgroundColor: "var(--surface-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "0.75rem",
              padding: "1rem",
            }}
          >
            <p
              style={{
                fontSize: "var(--type-meta)",
                lineHeight: "var(--leading-normal)",
                color: "var(--text-secondary)",
              }}
            >
              No upcoming events yet. Orbit will propose one soon.
            </p>
          </div>
        )}
      </div>

      {/* ── Chat feed + pinned input ───────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          marginTop: "0.75rem",
        }}
      >
        <GroupHome
          groupId={group.id}
          initialMessages={messages}
          viewerId={viewer?.id ?? null}
          viewerName={viewer?.name ?? null}
        />
      </div>
    </div>
  )
}
