// src/lib/events/format.ts
//
// Shared date/time formatting helpers for event display.
//
// Timezone-aware: all functions accept an optional `timeZone` (IANA string,
// e.g. "America/Los_Angeles"). Defaults to "UTC" for callers that don't yet
// have group timezone context.  Fixes the parked UTC-display debt from
// build-notes §11 (event-detail and orbit-scheduled-event slices).
//
// CRITICAL COUPLING (build-notes §11): this file and announce.ts must both
// use the timezone so card display and feed announcement always agree.

/**
 * Formats an event's start (and optional end) as a compact display string.
 *
 * Uses three-letter weekday abbreviations per CLAUDE.md §copy.
 * Uses "to" between times — no em/en dashes.
 *
 * Examples (America/Los_Angeles):
 *   "Sun, Jul 19 · 5pm"
 *   "Sun, Jul 19 · 5pm to 8pm"
 */
export function formatEventDate(
  startsAt: Date,
  endsAt: Date | null,
  timeZone = "UTC"
): string {
  const tz = { timeZone } as const

  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", ...tz }).format(startsAt)
  const month = new Intl.DateTimeFormat("en-US", { month: "short", ...tz }).format(startsAt)
  const day = new Intl.DateTimeFormat("en-US", { day: "numeric", ...tz }).format(startsAt)

  const startTime = formatTime(startsAt, timeZone)

  if (!endsAt) {
    return `${weekday}, ${month} ${day} · ${startTime}`
  }

  const endTime = formatTime(endsAt, timeZone)
  return `${weekday}, ${month} ${day} · ${startTime} to ${endTime}`
}

/**
 * Formats a time as "10am", "2:30pm", etc., in the given timezone.
 * Minutes are omitted when the time is on the hour.
 */
export function formatTime(date: Date, timeZone = "UTC"): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).formatToParts(date)

  const h = parts.find((p) => p.type === "hour")?.value ?? "12"
  const m = parts.find((p) => p.type === "minute")?.value ?? "00"
  const ampm = (parts.find((p) => p.type === "dayPeriod")?.value ?? "AM").toLowerCase()

  return m === "00" ? `${h}${ampm}` : `${h}:${m}${ampm}`
}
