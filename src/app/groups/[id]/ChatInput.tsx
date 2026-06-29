// src/app/groups/[id]/ChatInput.tsx
"use client"

// Controlled message input bar — purely presentational.
// All state lives in GroupHome; this component is display only.
//
// Send arrow: dim (--text-placeholder) when empty, teal when text is present.
// Per build-notes §7: contextual teal on the send arrow is not a second persistent
// primary — it only appears while composing text.

import { useId } from "react"

interface Props {
  groupId: string
  value: string
  onChange: (value: string) => void
  onSubmit: (formData: FormData) => void
  isPending: boolean
  errorMsg: string | null
}

export default function ChatInput({
  groupId,
  value,
  onChange,
  onSubmit,
  isPending,
  errorMsg,
}: Props) {
  const inputId = useId()
  const hasText = value.trim().length > 0

  return (
    <div
      style={{
        borderTop: "1px solid var(--border-subtle)",
        backgroundColor: "rgba(10,10,10,0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding: "0.625rem 1rem 0.75rem",
        flexShrink: 0,
      }}
    >
      {errorMsg && (
        <p
          style={{
            fontSize: "var(--type-meta)",
            color: "#f87171",
            marginBottom: "0.375rem",
          }}
        >
          {errorMsg}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit(new FormData(e.currentTarget))
        }}
        style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
      >
        <input type="hidden" name="groupId" value={groupId} />

        <label htmlFor={inputId} style={{ display: "none" }}>
          Send a message
        </label>
        <input
          id={inputId}
          name="body"
          type="text"
          autoComplete="off"
          placeholder="Message the group…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isPending}
          style={{
            flex: 1,
            padding: "0.5rem 0.875rem",
            backgroundColor: "var(--surface-input)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "1.5rem",
            color: "var(--text-primary)",
            fontSize: "var(--type-body)",
            outline: "none",
            caretColor: "var(--color-teal)",
            transition: "border-color 0.15s ease",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--border-medium)"
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border-subtle)"
          }}
        />

        <button
          type="submit"
          disabled={!hasText || isPending}
          aria-label="Send message"
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "none",
            backgroundColor: hasText ? "rgba(45,212,191,0.12)" : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: hasText && !isPending ? "pointer" : "default",
            flexShrink: 0,
            transition: "all 0.15s ease",
            color: hasText ? "var(--color-teal)" : "var(--text-placeholder)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M9 14V4M9 4L4.5 8.5M9 4L13.5 8.5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>
    </div>
  )
}
