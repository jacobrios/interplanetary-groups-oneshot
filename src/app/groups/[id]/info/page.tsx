// src/app/groups/[id]/info/page.tsx
//
// Group info page — design frame gi (group-info.html).
//
// Layout (top to bottom):
//   ← Group back link
//   Identity block: 72px neutral emblem + name + member count (centered)
//   Invite link section: eyebrow + URL row + teal share button (all logged-in members)
//   Single gi-card: Who row + activity row
//   Hint text
//   Leave group (non-founders only)
//
// Design changes from prior version:
//   - Emblem: neutral surface + border, no lime gradient
//   - Invite link: shown to all logged-in users (not founder-only), moved above the card
//   - Who + Activity: single card with gi-row pairs instead of separate cards
//   - Leave group: stays at bottom, non-founders

import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth/current-user"
import { parseRhythm } from "@/lib/orbit/rhythm"
import CopyInviteLink from "../CopyInviteLink"

interface Props {
  params: Promise<{ id: string }>
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function formatRhythmSummary(activities: unknown): string | null {
  const rhythm = parseRhythm(activities)
  if (!rhythm) return null

  const days = rhythm.daysOfWeek.map((d) => DAY_NAMES[d]).join(" & ")
  const [h, m] = rhythm.timeLocal.split(":").map(Number)
  const ampm = h < 12 ? "am" : "pm"
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  const timeStr = m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, "0")}${ampm}`
  const partOfDay = h < 12 ? "mornings" : h < 17 ? "afternoons" : "evenings"

  return `${days} ${partOfDay} @ ${timeStr}`
}

export default async function GroupInfoPage({ params }: Props) {
  const { id } = await params

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      memberships: {
        include: { user: true },
        orderBy: { joinedAt: "asc" },
      },
    },
  })
  if (!group) notFound()

  const viewer = await getCurrentUser()
  const isFounder = viewer?.id === group.founderId

  const rhythmSummary = formatRhythmSummary(group.recurringActivities)
  const rhythm = parseRhythm(group.recurringActivities)

  const initials = group.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")

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
      {/* Back link — inline, not sticky */}
      <div style={{ padding: "1rem 1rem 0" }}>
        <Link
          href={`/groups/${group.id}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            textDecoration: "none",
            color: "var(--text-secondary)",
            fontSize: "var(--type-body)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {group.name}
        </Link>
      </div>

      <div
        style={{
          padding: "1.25rem 1rem 3rem",
          width: "100%",
          maxWidth: "28rem",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {/* ── Identity — centered: neutral emblem + name + count ── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              backgroundColor: "var(--surface-card)",
              border: "2px solid var(--border-medium)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "var(--type-title)",
              fontWeight: 800,
              color: "var(--text-primary)",
              marginBottom: "0.25rem",
            }}
          >
            {initials}
          </div>
          <h1
            style={{
              fontSize: "var(--type-title)",
              fontWeight: 700,
              lineHeight: "var(--leading-tight)",
              margin: 0,
              letterSpacing: "-0.02em",
              textAlign: "center",
            }}
          >
            {group.name}
          </h1>
          <p style={{ fontSize: "var(--type-meta)", color: "var(--text-secondary)", margin: 0 }}>
            {group.memberships.length} member{group.memberships.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* ── Invite link — all logged-in members, above the card ── */}
        {viewer && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            <p
              style={{
                fontSize: "var(--type-eyebrow)",
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                margin: 0,
              }}
            >
              Group invite link
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                backgroundColor: "var(--surface-input)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "0.5rem",
                padding: "0.5rem 0.625rem",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0, color: "var(--text-secondary)" }}>
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.25" />
                <ellipse cx="7" cy="7" rx="2.5" ry="5.5" stroke="currentColor" strokeWidth="1.25" />
                <line x1="1.5" y1="7" x2="12.5" y2="7" stroke="currentColor" strokeWidth="1.25" />
              </svg>
              <p
                style={{
                  fontSize: "var(--type-meta)",
                  color: "var(--text-secondary)",
                  wordBreak: "break-all",
                  fontFamily: "monospace",
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                /join/{group.inviteToken}
              </p>
            </div>

            <CopyInviteLink inviteToken={group.inviteToken} />
          </div>
        )}

        {/* ── Single card: Who + Activity rows ─────────────────── */}
        <div
          style={{
            backgroundColor: "var(--surface-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "0.875rem",
            padding: "1.125rem 1.25rem",
          }}
        >
          <GiRow label="Who">
            {group.memberships.map((m) => m.user.name).join(" · ")}
          </GiRow>

          {rhythm && rhythmSummary && (
            <>
              <div style={{ height: 1, backgroundColor: "var(--border-subtle)", margin: "0.75rem 0" }} />
              <GiRow label={rhythm.activity.charAt(0).toUpperCase() + rhythm.activity.slice(1)}>
                {rhythmSummary}
              </GiRow>
            </>
          )}
        </div>

        {/* ── Hint text ─────────────────────────────────────────── */}
        <p
          style={{
            fontSize: "var(--type-meta)",
            color: "var(--text-secondary)",
            lineHeight: "var(--leading-normal)",
            paddingLeft: "0.25rem",
            margin: 0,
          }}
        >
          Want to change something? Just tell Orbit in the chat.
        </p>

        {/* ── Leave group — non-founders only ──────────────────── */}
        {viewer && !isFounder && (
          <button
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              backgroundColor: "transparent",
              color: "var(--text-secondary)",
              fontSize: "var(--type-body)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "0.625rem",
              cursor: "pointer",
              marginTop: "0.25rem",
              transition: "border-color 0.15s ease, color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#ef4444"
              e.currentTarget.style.color = "#ef4444"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-subtle)"
              e.currentTarget.style.color = "var(--text-secondary)"
            }}
          >
            Leave group
          </button>
        )}
      </div>
    </main>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GiRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "0.875rem", alignItems: "baseline" }}>
      <span
        style={{
          fontSize: "var(--type-eyebrow)",
          color: "var(--text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          flexShrink: 0,
          width: "4.5rem",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "var(--type-body)",
          lineHeight: "var(--leading-normal)",
          color: "var(--text-primary)",
        }}
      >
        {children}
      </span>
    </div>
  )
}
