// src/app/events/[id]/RsvpControls.tsx
"use client"
import { useOptimistic, useTransition, useState } from "react"
import { rsvpAction } from "@/app/actions/rsvp"
import { RsvpStatus } from "@prisma/client"

interface Props {
  eventId: string
  currentStatus: RsvpStatus | null
  compact?: boolean
  groupId?: string
}

/**
 * Two-button RSVP form.
 *
 * Button treatment per CLAUDE.md §color:
 * - "I'm in": teal primary (one per screen). Checkmark prefix when IN is active.
 * - "Can't make it": outlined secondary. Soft-decline copy per §copy rules.
 *
 * Active state via checkmark prefix — never color alone (§7 a11y rule).
 * Optimistic: flips instantly, reverts automatically on failure.
 */
export default function RsvpControls({ eventId, currentStatus, compact = false, groupId }: Props) {
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(currentStatus)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handle(formData: FormData) {
    startTransition(async () => {
      const next = formData.get("status") as RsvpStatus
      setErrorMsg(null)
      setOptimisticStatus(next)
      const result = await rsvpAction({}, formData)
      if (result?.errors?.general) {
        setErrorMsg(result.errors.general)
      }
    })
  }

  const btnPadding = compact ? "0.375rem 0.875rem" : "0.6875rem 1.25rem"
  const btnRadius = "999px"

  return (
    <form action={handle}>
      <input type="hidden" name="eventId" value={eventId} />
      {groupId && <input type="hidden" name="groupId" value={groupId} />}

      {errorMsg && (
        <p style={{ fontSize: "var(--type-meta)", color: "#f87171", marginBottom: "0.625rem" }}>
          {errorMsg}
        </p>
      )}

      <div style={{ display: "flex", gap: "0.5rem" }}>
        {/* Primary: teal fill */}
        <button
          type="submit"
          name="status"
          value={RsvpStatus.IN}
          disabled={isPending}
          style={{
            flex: 1,
            padding: btnPadding,
            backgroundColor: "var(--color-teal)",
            color: "var(--action-ink)",
            fontSize: "var(--type-label)",
            fontWeight: 700,
            border: "none",
            borderRadius: btnRadius,
            cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.7 : 1,
            transition: "opacity 0.15s ease, transform 0.1s ease",
            letterSpacing: "0.01em",
          }}
        >
          {optimisticStatus === RsvpStatus.IN ? "✓ I'm in" : "I'm in"}
        </button>

        {/* Secondary: outlined */}
        <button
          type="submit"
          name="status"
          value={RsvpStatus.OUT}
          disabled={isPending}
          style={{
            flex: 1,
            padding: btnPadding,
            backgroundColor: optimisticStatus === RsvpStatus.OUT
              ? "rgba(255,255,255,0.04)"
              : "transparent",
            color: optimisticStatus === RsvpStatus.OUT ? "var(--text-primary)" : "var(--text-secondary)",
            fontSize: "var(--type-label)",
            fontWeight: optimisticStatus === RsvpStatus.OUT ? 600 : 400,
            border: `1px solid ${optimisticStatus === RsvpStatus.OUT ? "var(--border-medium)" : "var(--border-subtle)"}`,
            borderRadius: btnRadius,
            cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.7 : 1,
            transition: "all 0.15s ease",
          }}
        >
          {optimisticStatus === RsvpStatus.OUT ? "✓ Can't make it" : "Can't make it"}
        </button>
      </div>
    </form>
  )
}
