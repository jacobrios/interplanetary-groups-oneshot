// src/app/join/[inviteToken]/JoinForm.tsx
"use client"

import { useActionState } from "react"
import { joinGroupAction, type JoinGroupState } from "@/app/actions/join-group"
import OrbitAvatar from "@/components/OrbitAvatar"

interface Props {
  groupName: string
  inviteToken: string
  currentName: string | null
  memberCount: number
  activityLabel: string | null
  scheduleString: string | null
}

const initialState: JoinGroupState = {}

export default function JoinForm({
  groupName,
  inviteToken,
  currentName,
  memberCount,
  activityLabel,
  scheduleString,
}: Props) {
  const [state, formAction, isPending] = useActionState(joinGroupAction, initialState)

  return (
    <main
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--surface-page)",
        background: "radial-gradient(ellipse at top, rgba(45,212,191,0.04) 0%, transparent 60%), var(--surface-page)",
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

        {/* "YOU'RE INVITED" eyebrow */}
        <p
          style={{
            fontSize: "var(--type-eyebrow)",
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "1rem",
          }}
        >
          You&rsquo;re invited
        </p>

        {/* Orbit message — avatar left, bubble right (design jn-msg) */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "0.5rem",
            marginBottom: "1.25rem",
          }}
        >
          <OrbitAvatar size={28} style={{ flexShrink: 0 }} />
          <div
            style={{
              backgroundColor: "var(--surface-orbit)",
              borderRadius: "4px 16px 16px 16px",
              padding: "0.75rem 0.875rem",
              border: "1px solid var(--border-subtle)",
              flex: 1,
            }}
          >
            <p style={{ fontSize: "var(--type-body)", lineHeight: "var(--leading-normal)", color: "var(--text-primary)", margin: 0 }}>
              Hey! I&rsquo;m Orbit. I keep {groupName} running so nobody has to be the organizer.
            </p>
          </div>
        </div>

        {/* Group info card */}
        <div
          style={{
            backgroundColor: "var(--surface-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "0.875rem",
            padding: "1rem 1.25rem",
            marginBottom: "1.25rem",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <p
            style={{
              fontSize: "var(--type-heading)",
              fontWeight: 700,
              lineHeight: "var(--leading-tight)",
              color: "var(--text-primary)",
              marginBottom: "0.75rem",
            }}
          >
            {groupName}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            <InfoRow label="WHO" value={`${memberCount} member${memberCount !== 1 ? "s" : ""}`} />
            {activityLabel && scheduleString && (
              <InfoRow label={activityLabel.toUpperCase()} value={scheduleString} />
            )}
          </div>
        </div>

        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <input type="hidden" name="inviteToken" value={inviteToken} />
          <input type="hidden" name="hasSession" value={currentName ? "1" : ""} />

          {state.errors?.general && (
            <p style={{ fontSize: "var(--type-meta)", color: "#f87171" }}>
              {state.errors.general}
            </p>
          )}

          {currentName === null ? (
            <input
              id="memberName"
              name="memberName"
              type="text"
              autoFocus
              autoComplete="given-name"
              placeholder="What should the crew call you?"
              style={{
                width: "100%",
                padding: "0.625rem 0.75rem",
                backgroundColor: "var(--surface-input)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "0.5rem",
                color: "var(--text-primary)",
                fontSize: "var(--type-body)",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s ease",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-teal)" }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)" }}
            />
          ) : (
            <p style={{ fontSize: "var(--type-body)", color: "var(--text-secondary)" }}>
              Joining as{" "}
              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{currentName}</span>
            </p>
          )}

          {state.errors?.memberName && (
            <p style={{ fontSize: "var(--type-meta)", color: "#f87171", marginTop: "-0.5rem" }}>
              {state.errors.memberName}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            style={{
              width: "100%",
              padding: "0.875rem 1.5rem",
              backgroundColor: isPending ? "var(--color-teal-hover)" : "var(--color-teal)",
              color: "var(--action-ink)",
              fontSize: "var(--type-body)",
              fontWeight: 800,
              border: "none",
              borderRadius: "999px",
              cursor: isPending ? "not-allowed" : "pointer",
              transition: "background-color 0.15s ease",
              letterSpacing: "0.01em",
              minHeight: "3.2em",
            }}
          >
            {isPending ? "Joining…" : `Join ${groupName} →`}
          </button>

          {/* Helper text */}
          <p
            style={{
              fontSize: "var(--type-meta)",
              color: "var(--text-secondary)",
              textAlign: "center",
              lineHeight: "var(--leading-normal)",
            }}
          >
            No app to download, no password. You&rsquo;ll land right in the group.
          </p>
        </form>
      </div>
    </main>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
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
      <span style={{ fontSize: "var(--type-body)", lineHeight: "var(--leading-normal)", color: "var(--text-primary)" }}>
        {value}
      </span>
    </div>
  )
}
