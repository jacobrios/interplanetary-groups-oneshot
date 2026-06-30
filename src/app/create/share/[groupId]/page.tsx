// src/app/create/share/[groupId]/page.tsx
//
// Onboarding Step 3 — Share the invite link.
//
// Design: header shows Orbit + STEP 3 OF 3 (matching Steps 1 and 2).
// The share card appears first (group name + invite link + teal share button),
// then Orbit's bubble below it, then the "Take me to my group" outlined button.
//
// Orbit bubble copy must not contain em-dashes or en-dashes (CLAUDE.md rule).

import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import CopyInviteLink from "@/app/groups/[id]/CopyInviteLink"
import OrbitAvatar from "@/components/OrbitAvatar"

interface Props {
  params: Promise<{ groupId: string }>
}

export default async function CreateSharePage({ params }: Props) {
  const { groupId } = await params

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { id: true, name: true, inviteToken: true },
  })

  if (!group) notFound()

  return (
    <main
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--surface-page)",
        background: "radial-gradient(ellipse at top, rgba(45,212,191,0.05) 0%, transparent 60%), var(--surface-page)",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1.5rem",
        fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "26rem" }}>

        {/* Header — Orbit + STEP 3 OF 3 (matches Steps 1 and 2) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            marginBottom: "1.5rem",
          }}
        >
          {/* Back to create */}
          <Link
            href="/create"
            aria-label="Back to create"
            style={{
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              marginRight: "0.125rem",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>

          {/* Orbit avatar — 44px slot, mark at 156% */}
          <OrbitAvatar size={44} />

          {/* Orbit name + step counter */}
          <div style={{ lineHeight: 1 }}>
            <p
              style={{
                fontSize: "var(--type-body)",
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Orbit
            </p>
            <p
              style={{
                fontSize: "var(--type-eyebrow)",
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                margin: "0.125rem 0 0",
              }}
            >
              STEP 3 OF 3
            </p>
          </div>
        </div>

        {/* Share card — group name + invite link + teal share button */}
        <div
          style={{
            backgroundColor: "var(--surface-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "0.875rem",
            overflow: "hidden",
            marginBottom: "1rem",
            boxShadow: "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ padding: "1.25rem 1.25rem 1rem" }}>
            {/* Group name */}
            <p
              style={{
                fontSize: "var(--type-heading)",
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: "0.75rem",
              }}
            >
              {group.name}
            </p>

            {/* Invite link label */}
            <p
              style={{
                fontSize: "var(--type-eyebrow)",
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "0.5rem",
              }}
            >
              Group invite link
            </p>

            {/* URL display */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                backgroundColor: "var(--surface-input)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "0.375rem",
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
          </div>

          {/* Teal footer — Share invite link */}
          <CopyInviteLink
            inviteToken={group.inviteToken}
            variant="footer"
          />
        </div>

        {/* Orbit bubble — no em-dashes per CLAUDE.md */}
        <div
          style={{
            backgroundColor: "var(--surface-orbit)",
            borderRadius: "4px 16px 16px 16px",
            padding: "0.875rem 1rem",
            border: "1px solid var(--border-subtle)",
            marginBottom: "1rem",
          }}
        >
          <p style={{ fontSize: "var(--type-body)", lineHeight: "var(--leading-normal)", color: "var(--text-primary)", margin: 0 }}>
            Here&rsquo;s your invite link. Send it to anyone you want. They just tap to join, and you can share it again anytime from inside your group.
          </p>
        </div>

        {/* "Take me to my group" — outlined button per mockup */}
        <Link
          href={`/groups/${group.id}`}
          style={{
            display: "block",
            textAlign: "center",
            padding: "0.75rem 1rem",
            color: "var(--text-primary)",
            fontSize: "var(--type-body)",
            fontWeight: 600,
            textDecoration: "none",
            border: "1px solid var(--border-subtle)",
            borderRadius: "0.625rem",
            transition: "border-color 0.15s ease",
          }}
        >
          Take me to my group →
        </Link>

        {/* Helper text */}
        <p
          style={{
            fontSize: "var(--type-meta)",
            color: "var(--text-secondary)",
            textAlign: "center",
            marginTop: "0.75rem",
          }}
        >
          You can invite people now or anytime later
        </p>
      </div>
    </main>
  )
}
