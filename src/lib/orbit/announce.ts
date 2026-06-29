// src/lib/orbit/announce.ts
//
// Generates deterministic, structured-extract-then-format feed copy from
// an event and rhythm (per CLAUDE.md §7 and build-notes §7).
//
// CRITICAL COUPLING (build-notes §11): updated in lockstep with format.ts
// to use the group's IANA timezone so the announcement always agrees with
// the card display. Both must convert using the same timezone.

import type { GroupRhythm } from "./rhythm"
import { formatTime } from "@/lib/events/format"

/**
 * Builds an announcement string for a newly created event.
 *
 * Template: "Next up: {activity} {weekday} at {time}. RSVP up top."
 *
 * - activity: from rhythm.activity
 * - weekday: 3-letter abbreviation in the group's timezone
 * - time: formatTime(event.startsAt, timeZone), e.g. "8am", "2:30pm"
 *
 * Example: "Next up: climbing Sun at 8am. RSVP up top."
 */
export function buildAnnouncement(
  event: { startsAt: Date },
  rhythm: { activity: string },
  timeZone = "UTC"
): string {
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone,
  }).format(event.startsAt)

  const time = formatTime(event.startsAt, timeZone)
  const activity = rhythm.activity

  return `Next up: ${activity} ${weekday} at ${time}. RSVP up top.`
}
