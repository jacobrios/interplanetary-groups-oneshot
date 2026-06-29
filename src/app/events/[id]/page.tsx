// src/app/events/[id]/page.tsx
import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth/current-user"
import { deriveRoster } from "@/lib/events/roster"
import { formatEventDate } from "@/lib/events/format"
import RsvpControls from "./RsvpControls"
import RosterAvatar from "./RosterAvatar"

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
        background: "radial-gradient(ellipse at top, rgba(45,212,191,0.04) 0%, transparent 50%), var(--surface-page)",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
      }}
    >
      {/* Sticky header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.875rem 1rem",
          backgroundColor: "rgba(10,10,10,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <Link
          href={`/groups/${event.groupId}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            textDecoration: "none",
            color: "var(--text-secondary)",
            fontSize: "var(--type-meta)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {event.group.name}
        </Link>
      </header>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "1.5rem 1rem 3rem",
        }}
      >
        <div style={{ width: "100%", maxWidth: "28rem" }}>

          {/* Event title */}
          <h1
            style={{
              fontSize: "var(--type-display)",
              lineHeight: "var(--leading-tight)",
              fontWeight: 700,
              marginBottom: "1.25rem",
              letterSpacing: "-0.02em",
            }}
          >
            {event.title}
          </h1>

          {/* ── Event details card ──────────────────────────────── */}
          <div
            style={{
              backgroundColor: "var(--surface-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "0.875rem",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.875rem",
              marginBottom: "0.75rem",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <MetaRow label="When" value={dateLabel} />
            {venueLabel && <MetaRow label="Where" value={venueLabel} />}
            {event.activityLabel && <MetaRow label="Activity" value={event.activityLabel} />}

            {viewer && (
              <>
                <div
                  style={{
                    height: 1,
                    backgroundColor: "var(--border-subtle)",
                    margin: "0.125rem 0",
                  }}
                />
                <RsvpControls eventId={event.id} currentStatus={viewerStatus} />
              </>
            )}
          </div>

          {/* ── Roster card ─────────────────────────────────────── */}
          <div
            style={{
              backgroundColor: "var(--surface-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "0.875rem",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              boxShadow: "var(--shadow-card)",
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
        </div>
      </div>
    </main>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        style={{
          fontSize: "var(--type-label)",
          lineHeight: "var(--leading-normal)",
          color: "var(--text-secondary)",
          marginBottom: "0.125rem",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: "var(--type-body)",
          lineHeight: "var(--leading-normal)",
          color: "var(--text-primary)",
        }}
      >
        {value}
      </p>
    </div>
  )
}

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
        {label} · {members.length}
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
