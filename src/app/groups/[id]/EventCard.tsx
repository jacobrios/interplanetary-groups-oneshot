// src/app/groups/[id]/EventCard.tsx
//
// The pinned compact event card at the top of the group home.
// Design rules (build-notes §7): counts-only status, 3-letter weekday,
// teal "I'm in" as the single primary action, outlined secondary.

import Link from "next/link"
import RsvpControls from "@/app/events/[id]/RsvpControls"
import { formatEventDate } from "@/lib/events/format"
import { formatCounts } from "@/lib/events/roster"
import { RsvpStatus } from "@prisma/client"

interface Props {
  event: {
    id: string
    title: string
    startsAt: Date
    endsAt: Date | null
    timeZone: string
    venues: { displayLabel: string | null; name: string }[]
  }
  groupId: string
  inCount: number
  outCount: number
  pendingCount: number
  viewerStatus: RsvpStatus | null
  viewerHasSession: boolean
}

export default function EventCard({
  event,
  groupId,
  inCount,
  outCount,
  pendingCount,
  viewerStatus,
  viewerHasSession,
}: Props) {
  const venue = event.venues[0] ?? null
  const venueLabel = venue ? (venue.displayLabel ?? venue.name) : null
  const dateLabel = formatEventDate(event.startsAt, event.endsAt, event.timeZone)
  const countsLabel = formatCounts({ inCount, outCount, pendingCount })

  return (
    <div
      style={{
        backgroundColor: "var(--surface-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "0.875rem",
        overflow: "hidden",
        flexShrink: 0,
        boxShadow: "var(--shadow-card)",
        transition: "border-color 0.15s ease",
      }}
    >
      {/* Card body — tappable link to event detail */}
      <Link
        href={`/events/${event.id}`}
        style={{
          display: "block",
          padding: "0.875rem 1rem 0.75rem",
          textDecoration: "none",
          color: "inherit",
        }}
      >
        {/* Event title */}
        <p
          style={{
            fontSize: "var(--type-heading)",
            lineHeight: "var(--leading-tight)",
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: "0.3rem",
          }}
        >
          {event.title}
        </p>

        {/* Metadata row */}
        <p
          style={{
            fontSize: "var(--type-meta)",
            lineHeight: "var(--leading-normal)",
            color: "var(--text-secondary)",
          }}
        >
          {dateLabel}
          {venueLabel && <span style={{ color: "var(--border-medium)" }}> · </span>}
          {venueLabel && venueLabel}
          <span style={{ color: "var(--border-medium)" }}> · </span>
          <span>{countsLabel}</span>
        </p>
      </Link>

      {/* RSVP controls */}
      {viewerHasSession && (
        <div
          style={{
            borderTop: "1px solid var(--border-subtle)",
            padding: "0.625rem 1rem",
          }}
        >
          <RsvpControls
            eventId={event.id}
            currentStatus={viewerStatus}
            compact
            groupId={groupId}
          />
        </div>
      )}
    </div>
  )
}
