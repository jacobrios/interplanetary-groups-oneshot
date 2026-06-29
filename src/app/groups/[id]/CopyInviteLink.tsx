// src/app/groups/[id]/CopyInviteLink.tsx
"use client"

import { useState } from "react"

interface Props {
  inviteToken: string
  /** "default" renders a standalone button. "footer" renders as a full-width
   *  card footer band (used in the onboarding share step). */
  variant?: "default" | "footer"
}

export default function CopyInviteLink({ inviteToken, variant = "default" }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      const url = `${window.location.origin}/join/${inviteToken}`
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard write failed — silent fallback; link is visible to copy manually.
    }
  }

  if (variant === "footer") {
    return (
      <button
        onClick={handleCopy}
        style={{
          display: "block",
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
        {copied ? "Copied!" : "Copy invite link"}
      </button>
    )
  }

  return (
    <button
      onClick={handleCopy}
      style={{
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
      {copied ? "Copied!" : "Copy invite link"}
    </button>
  )
}
