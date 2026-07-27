// src/app/events/[id]/page.tsx
//
// Event detail — design Variation B (event-detail.html, PhoneDetailB).
//
// Layout (top to bottom):
//   ← Group name back link (inline, not sticky)
//   Ticket card: title + When row (clock) + Where row (pin + MAP label) + RSVP footer band
//   "Add to calendar" teal pill button
//   "Who's coming" eyebrow + roster card
//   Orbit's slip note ("A NOTE FROM ORBIT" + muted body)
//
// RSVP footer band:
//   - Viewer has RSVPed: "✓ You're in" (or "Can't make it") + "Change" link
//   - Not RSVPed: RsvpControls inline (two pill buttons)
//   - No session: nothing in the band

import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth/current-user"
import { deriveRoster } from "@/lib/events/roster"
import { formatEventDate } from "@/lib/events/format"
import RsvpControls from "./RsvpControls"
import RosterAvatar from "./RosterAvatar"
import OrbitAvatar from "@/components/OrbitAvatar"

interface Props {
  params: Promise<{ id: string }>
}

export default async function EventPage({ params }: Props) {
  const { id } = await params

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      venues: true,
      rsvps: true,
      group: {
        include: {
          memberships: {
            include: { user: true },
            orderBy: { joinedAt: "asc" },
          },
        },
      },
    },
  })

  if (!event) notFound()

  const viewer = await getCurrentUser()

  const { inMembers, outMembers, pendingMembers, viewerStatus } = deriveRoster(
    event.group.memberships.map((m) => m.user),
    event.rsvps,
    viewer?.id ?? null
  )

  const venue = event.venues[0] ?? null
  const venueLabel = venue ? (venue.displayLabel ?? venue.name) : null
  const dateLabel = formatEventDate(event.startsAt, event.endsAt, event.group.timeZone)

  return (
    <main
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--surface-page)",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "1rem 1rem 3rem",
          width: "100%",
          maxWidth: "28rem",
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        {/* ── Back link ─────────────────────────────────────────── */}
        <Link
          href={`/groups/${event.groupId}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            textDecoration: "none",
            color: "var(--text-secondary)",
            fontSize: "var(--type-meta)",
            marginBottom: "1rem",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {event.group.name}
        </Link>

        {/* ── Ticket card ───────────────────────────────────────── */}
        <div
          style={{
            backgroundColor: "var(--surface-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "1rem",
            overflow: "hidden",
            marginBottom: "0.5rem",
          }}
        >
          {/* Title */}
          <div style={{ padding: "0.875rem 1rem 0.625rem" }}>
            <h1
              style={{
                fontSize: "var(--type-title)",
                lineHeight: "var(--leading-tight)",
                fontWeight: 800,
                margin: 0,
                letterSpacing: "-0.01em",
                color: "var(--text-primary)",
              }}
            >
              {event.title}
            </h1>
          </div>

          {/* When row */}
          <div
            style={{
              padding: "0.375rem 1rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.625rem",
              color: "var(--text-secondary)",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: "0.1em" }}>
              <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.25" />
              <path d="M7.5 4.5v3l2 1.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: "var(--type-meta)", lineHeight: "var(--leading-normal)" }}>
              {dateLabel}
            </span>
          </div>

          {/* Where row */}
          {venueLabel && (
            <div
              style={{
                padding: "0.375rem 1rem 0.625rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.625rem",
                color: "var(--text-secondary)",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: "0.1em" }}>
                <path d="M7.5 1.5C5.015 1.5 3 3.515 3 6c0 3.75 4.5 7.5 4.5 7.5S12 9.75 12 6c0-2.485-2.015-4.5-4.5-4.5z" stroke="currentColor" strokeWidth="1.25" />
                <circle cx="7.5" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.25" />
              </svg>
              <div>
                <div style={{ fontSize: "var(--type-meta)", lineHeight: "var(--leading-normal)" }}>
                  {venueLabel}
                </div>
                <div
                  style={{
                    fontSize: "var(--type-eyebrow)",
                    color: "var(--text-placeholder)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginTop: "0.125rem",
                  }}
                >
                  MAP
                </div>
              </div>
            </div>
          )}

          {/* RSVP footer band */}
          {viewer && (
            <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "0.875rem 1rem" }}>
              <RsvpControls eventId={event.id} currentStatus={viewerStatus} groupId={event.groupId} />
            </div>
          )}
        </div>

        {/* ── Add to calendar — teal pill primary ──────────────── */}
        <button
          type="button"
          style={{
            width: "100%",
            padding: "0.875rem 1.5rem",
            backgroundColor: "var(--color-teal)",
            color: "var(--action-ink)",
            fontSize: "var(--type-body)",
            fontWeight: 700,
            border: "1px solid var(--color-teal)",
            borderRadius: "999px",
            cursor: "pointer",
            minHeight: "3.2em",
            marginBottom: "1.25rem",
            transition: "background-color 0.15s ease",
          }}
        >
          Add to calendar
        </button>

        {/* ── Who's coming ──────────────────────────────────────── */}
        <p
          style={{
            fontSize: "var(--type-eyebrow)",
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "0.375rem",
          }}
        >
          Who&rsquo;s coming
        </p>

        <div
          style={{
            backgroundColor: "var(--surface-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "0.875rem",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            marginBottom: "1rem",
          }}
        >
          {inMembers.length > 0 && (
            <RosterSection label="In" members={inMembers} showCheck />
          )}
          {outMembers.length > 0 && (
            <RosterSection label="Can't make it" members={outMembers} />
          )}
          {pendingMembers.length > 0 && (
            <RosterSection label="Haven't replied" members={pendingMembers} />
          )}
          {event.group.memberships.length === 0 && (
            <p style={{ fontSize: "var(--type-meta)", color: "var(--text-secondary)" }}>
              No members yet.
            </p>
          )}
        </div>

        {/* ── Orbit's slip note ─────────────────────────────────── */}
        <div
          style={{
            backgroundColor: "var(--surface-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "0.75rem",
            padding: "0.875rem 1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.375rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <OrbitAvatar size={28} />
            <span
              style={{
                fontSize: "var(--type-eyebrow)",
                color: "var(--text-placeholder)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              A note from Orbit
            </span>
          </div>
          <p
            style={{
              fontSize: "var(--type-meta)",
              color: "var(--text-secondary)",
              lineHeight: "var(--leading-normal)",
              margin: 0,
              paddingLeft: "2.25rem",
            }}
          >
            I&apos;ll keep nudging folks who haven&apos;t replied. Tell me in the chat if anything
            changes.
          </p>
        </div>
      </div>
    </main>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RosterSection({
  label,
  members,
  showCheck,
}: {
  label: string
  members: { id: string; name: string }[]
  showCheck?: boolean
}) {
  return (
    <div>
      <p
        style={{
          fontSize: "var(--type-eyebrow)",
          lineHeight: "var(--leading-normal)",
          color: showCheck ? "var(--color-teal)" : "var(--text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "0.625rem",
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
        }}
      >
        {showCheck && <span>✓</span>}
        {label} &middot; {members.length}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {members.map((member) => (
          <div
            key={member.id}
            style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}
          >
            <RosterAvatar name={member.name} size={28} />
            <span
              style={{
                fontSize: "var(--type-body)",
                lineHeight: "var(--leading-normal)",
                color: "var(--text-primary)",
              }}
            >
              {member.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
