// src/app/join/[inviteToken]/JoinForm.tsx
"use client"

import { useActionState } from "react"
import { joinGroupAction, type JoinGroupState } from "@/app/actions/join-group"

interface Props {
  groupName: string
  inviteToken: string
  currentName: string | null
}

const initialState: JoinGroupState = {}

export default function JoinForm({ groupName, inviteToken, currentName }: Props) {
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

        {/* Orbit avatar + group name */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              backgroundColor: "var(--color-lime)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.875rem",
              fontWeight: 700,
              color: "#0a0a0a",
              flexShrink: 0,
              boxShadow: "0 0 12px rgba(163,230,53,0.3)",
            }}
          >
            O
          </div>
          <div>
            <p style={{ fontSize: "var(--type-eyebrow)", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.125rem" }}>
              You&rsquo;re invited to
            </p>
            <p style={{ fontSize: "var(--type-heading)", fontWeight: 700, color: "var(--text-primary)", lineHeight: "var(--leading-tight)" }}>
              {groupName}
            </p>
          </div>
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
            Hey! Keep {groupName} running so nobody has to be the organizer. No sign-up, no password. What should we call you?
          </p>
        </div>

        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <input type="hidden" name="inviteToken" value={inviteToken} />
          <input type="hidden" name="hasSession" value={currentName ? "1" : ""} />

          {state.errors?.general && (
            <p style={{ fontSize: "var(--type-meta)", color: "#f87171" }}>
              {state.errors.general}
            </p>
          )}

          {currentName === null ? (
            <div>
              <label
                htmlFor="memberName"
                style={{
                  display: "block",
                  fontSize: "var(--type-label)",
                  color: "var(--text-secondary)",
                  marginBottom: "0.375rem",
                }}
              >
                Your name
              </label>
              <input
                id="memberName"
                name="memberName"
                type="text"
                autoFocus
                autoComplete="given-name"
                placeholder="e.g. Jordan"
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
              {state.errors?.memberName && (
                <p style={{ fontSize: "var(--type-meta)", color: "#f87171", marginTop: "0.25rem" }}>
                  {state.errors.memberName}
                </p>
              )}
            </div>
          ) : (
            <p style={{ fontSize: "var(--type-body)", color: "var(--text-secondary)" }}>
              Joining as{" "}
              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{currentName}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            style={{
              width: "100%",
              padding: "0.875rem 1.5rem",
              backgroundColor: isPending ? "var(--color-teal-hover)" : "var(--color-teal)",
              color: "#0a0a0a",
              fontSize: "var(--type-body)",
              fontWeight: 700,
              border: "none",
              borderRadius: "0.625rem",
              cursor: isPending ? "not-allowed" : "pointer",
              transition: "background-color 0.15s ease",
              letterSpacing: "0.01em",
            }}
          >
            {isPending ? "Joining…" : `Join ${groupName}`}
          </button>
        </form>
      </div>
    </main>
  )
}
