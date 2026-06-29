// src/app/groups/[id]/info/page.tsx
//
// Group info page — mockup frame 10.
// Shows group identity, member list, activity rhythm, and the invite link (founder).
// "A NOTE FROM ORBIT" reference note (not a bubble — no next action expected here).
//
// Founder-only: invite link. All members: full member list and group rhythm.

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

  // Approximate part of day
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

  // Group emblem: initials from group name
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
        background: "radial-gradient(ellipse at 50% 0%, rgba(163,230,53,0.03) 0%, transparent 50%), var(--surface-page)",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
      }}
    >
      {/* Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          padding: "0.875rem 1rem",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
          backgroundColor: "rgba(10,10,10,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <Link
          href={`/groups/${group.id}`}
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
          Back
        </Link>
        <span
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: "var(--type-body)",
            fontWeight: 600,
          }}
        >
          Group info
        </span>
        <div style={{ width: 40 }} aria-hidden="true" />
      </header>

      <div
        style={{
          padding: "1.5rem 1rem 3rem",
          width: "100%",
          maxWidth: "28rem",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {/* ── Group identity ─────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--color-lime) 0%, #86d24a 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "#0a0a0a",
              flexShrink: 0,
              boxShadow: "0 4px 16px rgba(163,230,53,0.2)",
            }}
          >
            {initials}
          </div>
          <div>
            <h1
              style={{
                fontSize: "var(--type-title)",
                fontWeight: 700,
                lineHeight: "var(--leading-tight)",
                marginBottom: "0.125rem",
                letterSpacing: "-0.02em",
              }}
            >
              {group.name}
            </h1>
            <p style={{ fontSize: "var(--type-meta)", color: "var(--text-secondary)" }}>
              {group.memberships.length} member{group.memberships.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* ── Invite link (founder only) ─────────────────────────── */}
        {isFounder && (
          <InfoCard>
            <SectionLabel>Group invite link</SectionLabel>
            <p
              style={{
                fontSize: "var(--type-meta)",
                color: "var(--text-secondary)",
                wordBreak: "break-all",
                fontFamily: "monospace",
                backgroundColor: "var(--surface-input)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "0.375rem",
                padding: "0.5rem 0.625rem",
                marginBottom: "0.875rem",
              }}
            >
              /join/{group.inviteToken}
            </p>
            <CopyInviteLink inviteToken={group.inviteToken} />
            <p style={{ fontSize: "var(--type-meta)", color: "var(--text-secondary)", marginTop: "0.75rem" }}>
              Anyone with the link can join. No approval needed.
            </p>
          </InfoCard>
        )}

        {/* ── Member list — horizontal inline name run (mockup screen 10) ── */}
        <InfoCard>
          <SectionLabel>Who</SectionLabel>
          <p
            style={{
              fontSize: "var(--type-body)",
              lineHeight: "var(--leading-normal)",
              color: "var(--text-primary)",
            }}
          >
            {group.memberships.map((m) => m.user.name).join("  ")}
          </p>
        </InfoCard>

        {/* ── Activity rhythm ───────────────────────────────────────── */}
        {rhythm && rhythmSummary && (
          <InfoCard>
            <SectionLabel>{rhythm.activity.toUpperCase()}</SectionLabel>
            <p style={{ fontSize: "var(--type-body)", color: "var(--text-primary)" }}>
              {rhythmSummary}
            </p>
          </InfoCard>
        )}

        {/* ── Orbit reference note ─────────────────────────────────── */}
        <div
          style={{
            backgroundColor: "rgba(163,230,53,0.05)",
            border: "1px solid rgba(163,230,53,0.12)",
            borderRadius: "0.75rem",
            padding: "1rem",
          }}
        >
          <p
            style={{
              fontSize: "var(--type-eyebrow)",
              color: "var(--color-lime)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "0.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
            }}
          >
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                backgroundColor: "var(--color-lime)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.5rem",
                fontWeight: 700,
                color: "#0a0a0a",
                flexShrink: 0,
              }}
            >
              O
            </span>
            A note from Orbit
          </p>
          <p
            style={{
              fontSize: "var(--type-meta)",
              lineHeight: "var(--leading-normal)",
              color: "var(--text-secondary)",
            }}
          >
            Want to change something? Just tell me in the chat. No admin settings needed.
          </p>
        </div>

        {/* ── Leave group (placeholder, non-destructive) ───────────── */}
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
              marginTop: "0.5rem",
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

// ─── Small sub-components ─────────────────────────────────────────────────────

function InfoCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: "var(--surface-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "0.875rem",
        padding: "1.125rem 1.25rem",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: "var(--type-eyebrow)",
        color: "var(--text-secondary)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: "0.75rem",
      }}
    >
      {children}
    </p>
  )
}
