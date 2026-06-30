// src/app/create/page.tsx
//
// Founder onboarding wizard — three logical steps in a single page.
//
// Step 1: Orbit asks "Tell me about your group" (free text) + founder name.
//         Browser timezone captured as a hidden value.
// Step 2: Playback card showing what Orbit extracted. Gap-ask if fields missing.
//         "Looks right, set up invites" → createGroupAction → /create/share/[id]
// Step 3: The share step lives at /create/share/[id] (own page, own URL).
//
// Architecture: client-side wizard state (useState for step, extracted data,
// errors). All Anthropic calls go through /api/orbit/extract — never client-side.
// The group is created at the end of Step 2 via createGroupAction (server action).
//
// Decisions logged in DECISIONS.md:
// - Group name derived from description (not typed)
// - Timezone from browser Intl API
// - Missing fields → single gap-ask before proceeding
// - Single-page wizard (not multi-route)

"use client"

import { useState, useRef, useEffect, useTransition } from "react"
import { createGroupAction } from "@/app/actions/create-group"
import type { ExtractionResult } from "@/lib/orbit/extract"
import OrbitAvatar from "@/components/OrbitAvatar"

type Step = "step1" | "extracting" | "gap" | "step2"

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MAX_CHARS = 500

function formatDays(daysOfWeek: number[]): string {
  if (daysOfWeek.length === 0) return ""
  if (daysOfWeek.length === 1) return `${DAY_NAMES[daysOfWeek[0]]}s`
  return daysOfWeek.map((d) => DAY_NAMES[d]).join(" & ")
}

function formatTimeLocal(timeLocal: string): string {
  const [h, m] = timeLocal.split(":").map(Number)
  const ampm = h < 12 ? "am" : "pm"
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, "0")}${ampm}`
}

function buildScheduleString(extracted: ExtractionResult): string {
  const parts: string[] = []
  if (extracted.daysOfWeek) {
    parts.push(formatDays(extracted.daysOfWeek))
  }
  if (extracted.timeLocal) {
    const [h] = extracted.timeLocal.split(":").map(Number)
    const partOfDay = h < 12 ? "mornings" : h < 17 ? "afternoons" : "evenings"
    parts.push(partOfDay)
    parts.push(`@ ${formatTimeLocal(extracted.timeLocal)}`)
  }
  return parts.join(" ") || "Schedule TBD"
}

export default function CreatePage() {
  const [step, setStep] = useState<Step>("step1")
  const [founderName, setFounderName] = useState("")
  const [description, setDescription] = useState("")
  const [gapAnswer, setGapAnswer] = useState("")
  const [gapRetry, setGapRetry] = useState(false)
  const [extracted, setExtracted] = useState<ExtractionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; description?: string }>({})
  const [correction, setCorrection] = useState("")
  const [correcting, setCorrecting] = useState(false)
  const timezoneRef = useRef<string>("UTC")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    try {
      timezoneRef.current = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    } catch {
      timezoneRef.current = "UTC"
    }
  }, [])

  async function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault()
    const errs: typeof fieldErrors = {}
    if (!founderName.trim()) errs.name = "What should we call you?"
    if (!description.trim()) errs.description = "Tell us a little about your group."
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
    setError(null)
    setStep("extracting")

    try {
      const res = await fetch("/api/orbit/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          founderName: founderName.trim(),
        }),
      })
      if (!res.ok) throw new Error("extraction failed")
      const data = (await res.json()) as ExtractionResult
      setExtracted(data)

      if (data.missingFields.length > 0) {
        setGapRetry(false)
        setStep("gap")
      } else {
        setStep("step2")
      }
    } catch {
      setError("Something went wrong. Please try again.")
      setStep("step1")
    }
  }

  async function handleGapSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!gapAnswer.trim()) return
    setError(null)
    setStep("extracting")

    const combined = `${description.trim()}\n${gapAnswer.trim()}`
    try {
      const res = await fetch("/api/orbit/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: combined,
          founderName: founderName.trim(),
        }),
      })
      if (!res.ok) throw new Error("extraction failed")
      const data = (await res.json()) as ExtractionResult
      setDescription(combined)
      setGapAnswer("")

      if (data.missingFields.length > 0) {
        // Still missing — re-ask. Never advance without a complete rhythm
        // (build-notes §5 hard guardrail; "ask if missing, don't guess").
        setExtracted(data)
        setGapRetry(true)
        setStep("gap")
      } else {
        setExtracted(data)
        setStep("step2")
      }
    } catch {
      setError("Something went wrong. Please try again.")
      setStep("gap")
    }
  }

  async function handleCorrection(e: React.FormEvent) {
    e.preventDefault()
    if (!correction.trim() || !extracted || correcting) return
    setCorrecting(true)
    setError(null)

    const combined = `${description.trim()}\n${correction.trim()}`
    try {
      const res = await fetch("/api/orbit/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: combined,
          founderName: founderName.trim(),
        }),
      })
      if (!res.ok) throw new Error("extraction failed")
      const data = (await res.json()) as ExtractionResult
      setExtracted(data)
      setDescription(combined)
      setCorrection("")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setCorrecting(false)
    }
  }

  function handleConfirm() {
    if (!extracted) return
    startTransition(async () => {
      const fd = new FormData()
      fd.set("founderName", founderName.trim())
      fd.set("groupName", extracted.groupName)
      fd.set("timeZone", timezoneRef.current)
      if (extracted.activity) fd.set("activity", extracted.activity)
      if (extracted.daysOfWeek) fd.set("daysOfWeek", JSON.stringify(extracted.daysOfWeek))
      if (extracted.timeLocal) fd.set("timeLocal", extracted.timeLocal)
      if (extracted.durationMinutes != null)
        fd.set("durationMinutes", String(extracted.durationMinutes))

      const result = await createGroupAction({}, fd)
      if (result?.errors?.general) {
        setError(result.errors.general)
      }
    })
  }

  const isStep2 = step === "step2"
  const isLoading = step === "extracting"

  return (
    <main
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--surface-page)",
        background: "radial-gradient(ellipse at top, rgba(163,230,53,0.04) 0%, transparent 60%), var(--surface-page)",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: isStep2 ? "flex-start" : "center",
        padding: isStep2 ? "2rem 1.5rem 0" : "2rem 1.5rem",
        fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "26rem" }}>

        {/* ── Header: Orbit avatar + name + step indicator ──────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            marginBottom: "1.5rem",
          }}
        >
          {/* Back button (Step 2 only) */}
          {isStep2 && (
            <button
              onClick={() => setStep("step1")}
              aria-label="Back to step 1"
              style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: "0.25rem",
                marginRight: "0.125rem",
                display: "flex",
                alignItems: "center",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          {/* Orbit avatar — 44px slot per design s2-av, mark at 156% */}
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
              {isStep2 ? "STEP 2 OF 3" : "STEP 1 OF 3"}
            </p>
          </div>
        </div>

        {/* ── Step 1: Description + name ───────────────────────── */}
        {(step === "step1" || isLoading) && (
          <form onSubmit={handleStep1Submit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Orbit speech bubble — the one tailed bubble in the product */}
            <div style={{ position: "relative", marginBottom: "0.25rem" }}>
              <div
                style={{
                  position: "absolute",
                  top: -8,
                  left: 16,
                  width: 0,
                  height: 0,
                  borderLeft: "8px solid transparent",
                  borderRight: "8px solid transparent",
                  borderBottom: "8px solid var(--surface-orbit)",
                }}
              />
              <div
                style={{
                  backgroundColor: "var(--surface-orbit)",
                  borderRadius: "4px 16px 16px 16px",
                  padding: "0.875rem 1rem",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <p
                  style={{
                    fontSize: "var(--type-body)",
                    lineHeight: "var(--leading-normal)",
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  Hey! Tell me about your group and I&rsquo;ll handle the rest.
                </p>
              </div>
            </div>

            {/* Description textarea with character counter */}
            <div style={{ position: "relative" }}>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, MAX_CHARS))}
                placeholder="e.g. We're a crew of 8 friends who go climbing every Monday and Wednesday morning at 8am at Crux gym."
                rows={4}
                style={{
                  width: "100%",
                  padding: "0.75rem 0.75rem 1.75rem",
                  backgroundColor: "var(--surface-input)",
                  border: `1px solid ${fieldErrors.description ? "#f87171" : "var(--border-subtle)"}`,
                  borderRadius: "0.625rem",
                  color: "var(--text-primary)",
                  fontSize: "var(--type-body)",
                  lineHeight: "var(--leading-normal)",
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  transition: "border-color 0.15s ease",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-lime)" }}
                onBlur={(e) => { e.currentTarget.style.borderColor = fieldErrors.description ? "#f87171" : "var(--border-subtle)" }}
              />
              {/* Character counter — bottom-right of the textarea */}
              <span
                style={{
                  position: "absolute",
                  bottom: "0.5rem",
                  right: "0.75rem",
                  fontSize: "var(--type-eyebrow)",
                  color: "var(--text-secondary)",
                  pointerEvents: "none",
                }}
              >
                {description.length} / {MAX_CHARS}
              </span>
              {fieldErrors.description && (
                <p style={{ fontSize: "var(--type-meta)", color: "#f87171", marginTop: "0.25rem" }}>
                  {fieldErrors.description}
                </p>
              )}
            </div>

            {/* Founder name — uppercase eyebrow label matching mockup */}
            <div>
              <label
                htmlFor="founderName"
                style={{
                  display: "block",
                  fontSize: "var(--type-eyebrow)",
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: "0.5rem",
                }}
              >
                What should the crew call you?
              </label>
              <input
                id="founderName"
                type="text"
                autoComplete="given-name"
                placeholder="e.g. Alex"
                value={founderName}
                onChange={(e) => setFounderName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.625rem 0.75rem",
                  backgroundColor: "var(--surface-input)",
                  border: `1px solid ${fieldErrors.name ? "#f87171" : "var(--border-subtle)"}`,
                  borderRadius: "0.5rem",
                  color: "var(--text-primary)",
                  fontSize: "var(--type-body)",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.15s ease",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-lime)" }}
                onBlur={(e) => { e.currentTarget.style.borderColor = fieldErrors.name ? "#f87171" : "var(--border-subtle)" }}
              />
              {fieldErrors.name && (
                <p style={{ fontSize: "var(--type-meta)", color: "#f87171", marginTop: "0.25rem" }}>
                  {fieldErrors.name}
                </p>
              )}
            </div>

            {error && (
              <p style={{ fontSize: "var(--type-meta)", color: "#f87171" }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "0.875rem 1.5rem",
                backgroundColor: isLoading ? "var(--color-teal-hover)" : "var(--color-teal)",
                color: "var(--action-ink)",
                fontSize: "var(--type-body)",
                fontWeight: 700,
                border: "none",
                borderRadius: "0.625rem",
                cursor: isLoading ? "wait" : "pointer",
                transition: "background-color 0.15s ease, transform 0.1s ease",
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = "var(--color-teal-hover)"
                  e.currentTarget.style.transform = "translateY(-1px)"
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isLoading ? "var(--color-teal-hover)" : "var(--color-teal)"
                e.currentTarget.style.transform = "translateY(0)"
              }}
            >
              {isLoading ? "Thinking…" : "Continue →"}
            </button>

            {/* Helper text below the CTA */}
            <p
              style={{
                fontSize: "var(--type-meta)",
                color: "var(--text-secondary)",
                textAlign: "center",
                lineHeight: "var(--leading-normal)",
                marginTop: "-0.25rem",
              }}
            >
              Orbit reads this to set your days, send reminders, and build a shared group page.
            </p>
          </form>
        )}

        {/* ── Gap-ask: missing fields ───────────────────────────── */}
        {step === "gap" && extracted && (
          <form onSubmit={handleGapSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div
              style={{
                backgroundColor: "var(--surface-orbit)",
                borderRadius: "4px 16px 16px 16px",
                padding: "0.875rem 1rem",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <p style={{ fontSize: "var(--type-body)", lineHeight: "var(--leading-normal)", color: "var(--text-primary)", margin: 0 }}>
                {gapRetry
                  ? extracted.missingFields.includes("daysOfWeek")
                    ? "I need specific days to set up your schedule. Which days does your group meet, like Mon and Wed?"
                    : "I need a specific time to send reminders. What time does your group meet, like 8am or 7pm?"
                  : extracted.missingFields.includes("daysOfWeek")
                    ? "Got it. One question: What days do you usually meet?"
                    : "Got it. One question: What time do you usually meet?"}
              </p>
            </div>

            <input
              type="text"
              autoFocus
              placeholder={
                extracted.missingFields.includes("daysOfWeek")
                  ? "e.g. Monday and Wednesday"
                  : "e.g. 8am, or 7 in the evening"
              }
              value={gapAnswer}
              onChange={(e) => setGapAnswer(e.target.value)}
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
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-lime)" }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)" }}
            />

            {error && (
              <p style={{ fontSize: "var(--type-meta)", color: "#f87171" }}>{error}</p>
            )}

            <button
              type="submit"
              style={{
                width: "100%",
                padding: "0.875rem 1.5rem",
                backgroundColor: "var(--color-teal)",
                color: "var(--action-ink)",
                fontSize: "var(--type-body)",
                fontWeight: 700,
                border: "none",
                borderRadius: "0.625rem",
                cursor: "pointer",
                transition: "background-color 0.15s ease",
              }}
            >
              Got it, continue
            </button>
          </form>
        )}

        {/* ── Step 2: Playback card + confirm ──────────────────── */}
        {isStep2 && extracted && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* Playback card — separate from the Orbit bubble below */}
            <div
              style={{
                backgroundColor: "var(--surface-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "0.875rem",
                overflow: "hidden",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div style={{ padding: "1rem 1.25rem 0.875rem" }}>
                {/* Group name */}
                <p
                  style={{
                    fontSize: "var(--type-heading)",
                    lineHeight: "var(--leading-tight)",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    marginBottom: "0.75rem",
                  }}
                >
                  {extracted.groupName}
                </p>

                {/* Separator */}
                <div
                  style={{
                    height: 1,
                    backgroundColor: "var(--border-subtle)",
                    marginBottom: "0.75rem",
                  }}
                />

                {/* Label-value rows */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  <PlaybackRow
                    label="WHO"
                    value={`${founderName.trim()} + their crew`}
                  />
                  {extracted.activity && (
                    <PlaybackRow
                      label={extracted.activity.toUpperCase()}
                      value={buildScheduleString(extracted)}
                    />
                  )}
                </div>
              </div>

              {/* Teal card footer — primary CTA */}
              <button
                onClick={handleConfirm}
                disabled={isPending}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "0.875rem 1.25rem",
                  backgroundColor: isPending ? "var(--color-teal-hover)" : "var(--color-teal)",
                  color: "var(--action-ink)",
                  fontSize: "var(--type-body)",
                  fontWeight: 700,
                  border: "none",
                  cursor: isPending ? "wait" : "pointer",
                  textAlign: "center",
                  transition: "background-color 0.15s ease",
                  letterSpacing: "0.01em",
                }}
              >
                {isPending ? "Creating your group…" : "Looks right, set up invites →"}
              </button>
            </div>

            {/* Orbit chat bubble — invites corrections */}
            <div
              style={{
                backgroundColor: "var(--surface-orbit)",
                borderRadius: "4px 16px 16px 16px",
                padding: "0.875rem 1rem",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <p
                style={{
                  fontSize: "var(--type-body)",
                  lineHeight: "var(--leading-normal)",
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                That&rsquo;s what I picked up, name and all. Tell me anything you&rsquo;d like to change and I&rsquo;ll update it above.
              </p>
            </div>

            {error && (
              <p style={{ fontSize: "var(--type-meta)", color: "#f87171" }}>{error}</p>
            )}

            {/* Correction message input */}
            <form
              onSubmit={handleCorrection}
              style={{
                display: "flex",
                gap: "0.5rem",
                alignItems: "center",
                backgroundColor: "var(--surface-input)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "1.5rem",
                padding: "0.375rem 0.5rem 0.375rem 1rem",
              }}
            >
              <input
                type="text"
                value={correction}
                onChange={(e) => setCorrection(e.target.value)}
                placeholder="Message Orbit"
                disabled={correcting}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary)",
                  fontSize: "var(--type-body)",
                }}
              />
              <button
                type="submit"
                disabled={correcting || !correction.trim()}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  backgroundColor: correcting || !correction.trim() ? "var(--border-subtle)" : "var(--color-teal)",
                  color: "var(--action-ink)",
                  border: "none",
                  cursor: correcting || !correction.trim() ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background-color 0.15s ease",
                }}
              >
                {correcting ? (
                  <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>…</span>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 11V3M3 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </form>

            {/* Hint text */}
            <p
              style={{
                fontSize: "var(--type-meta)",
                color: "var(--text-secondary)",
                textAlign: "center",
                marginTop: "-0.25rem",
              }}
            >
              e.g. &ldquo;we also climb Fridays&rdquo; &middot; &ldquo;beers are once a month&rdquo;
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PlaybackRow({ label, value }: { label: string; value: string }) {
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
        {value}
      </span>
    </div>
  )
}
