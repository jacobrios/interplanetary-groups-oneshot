// src/app/create/share/[groupId]/page.tsx
//
// Onboarding Step 3 — Share the invite link.
//
// This page is the natural landing after a new group is created in Step 2.
// It shows the group name, a copyable invite link, and a "Take me to my group"
// teal CTA.
//
// Design rule (§7): the invite link is the primary action here — teal.
// The "Take me to my group" button is secondary (outlined).
// This page is ungated — the founder must have just come from /create, so
// their session exists, but we don't verify membership here.

import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import CopyInviteLink from "@/app/groups/[id]/CopyInviteLink"
import Link from "next/link"

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

  const inviteUrl =
    typeof window === "undefined"
      ? `/join/${group.inviteToken}` // relative for SSR (host unknown)
      : `${window.location.origin}/join/${group.inviteToken}`

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

        {/* Header mark */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "2rem" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--color-lime)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "#0a0a0a",
              flexShrink: 0,
              boxShadow: "0 0 12px rgba(163,230,53,0.3)",
            }}
          >
            O
          </div>
          <span
            style={{
              fontSize: "var(--type-heading)",
              fontWeight: 700,
              background: "linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Interplanetary Groups
          </span>
        </div>

        {/* Orbit bubble */}
        <div
          style={{
            backgroundColor: "var(--surface-orbit)",
            borderRadius: "4px 16px 16px 16px",
            padding: "0.875rem 1rem",
            border: "1px solid rgba(163,230,53,0.1)",
            marginBottom: "1.5rem",
          }}
        >
          <p style={{ fontSize: "var(--type-body)", lineHeight: "var(--leading-normal)", color: "var(--text-primary)", margin: 0 }}>
            <strong>{group.name}</strong> is ready! Share this link so your crew can join. I&rsquo;ll take it from there.
          </p>
        </div>

        {/* Invite link card */}
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
              }}
            >
              /join/{group.inviteToken}
            </p>
          </div>

          {/* Teal footer — Copy to clipboard */}
          <CopyInviteLink
            inviteToken={group.inviteToken}
            variant="footer"
          />
        </div>

        {/* Secondary: go to group */}
        <Link
          href={`/groups/${group.id}`}
          style={{
            display: "block",
            width: "100%",
            padding: "0.875rem 1.5rem",
            backgroundColor: "transparent",
            color: "var(--text-primary)",
            fontSize: "var(--type-body)",
            fontWeight: 600,
            border: "1px solid var(--border-subtle)",
            borderRadius: "0.625rem",
            cursor: "pointer",
            textAlign: "center",
            textDecoration: "none",
            boxSizing: "border-box",
          }}
        >
          Take me to my group
        </Link>
      </div>
    </main>
  )
}
