// src/app/groups/[id]/CopyInviteLink.tsx
"use client"

import { useState } from "react"

interface Props {
  inviteToken: string
  /** "default" renders a standalone button. "footer" renders as a full-width
   *  card footer band with no border-radius (used in onboarding share step and
   *  group info). */
  variant?: "default" | "footer"
}

export default function CopyInviteLink({ inviteToken, variant = "default" }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const url = `${window.location.origin}/join/${inviteToken}`
    try {
      if (navigator.share) {
        await navigator.share({ title: "Join my group", url })
        return
      }
    } catch {
      // User cancelled share or API unavailable — fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard write failed — silent fallback; link is visible to copy manually.
    }
  }

  const label = copied ? "Copied!" : "Share invite link"

  if (variant === "footer") {
    return (
      <button
        onClick={handleShare}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          width: "100%",
          padding: "0.875rem 1.25rem",
          backgroundColor: copied ? "var(--color-teal-hover)" : "var(--color-teal)",
          color: "#0a0a0a",
          fontSize: "var(--type-body)",
          fontWeight: 700,
          border: "none",
          cursor: "pointer",
          textAlign: "center",
          transition: "background-color 0.15s ease",
          letterSpacing: "0.01em",
        }}
      >
        {!copied && (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 11V3M4 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {label}
      </button>
    )
  }

  return (
    <button
      onClick={handleShare}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        width: "100%",
        padding: "0.75rem 1.5rem",
        backgroundColor: copied ? "var(--color-teal-hover)" : "var(--color-teal)",
        color: "#0a0a0a",
        fontSize: "var(--type-body)",
        fontWeight: 600,
        border: "none",
        borderRadius: "0.5rem",
        cursor: "pointer",
        transition: "background-color 0.15s ease",
      }}
    >
      {!copied && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 11V3M4 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {label}
    </button>
  )
}
