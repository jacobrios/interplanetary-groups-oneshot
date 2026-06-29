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

type Step = "step1" | "extracting" | "gap" | "step2"

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

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

export default function CreatePage() {
  const [step, setStep] = useState<Step>("step1")
  const [founderName, setFounderName] = useState("")
  const [description, setDescription] = useState("")
  const [gapAnswer, setGapAnswer] = useState("")
  const [extracted, setExtracted] = useState<ExtractionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; description?: string }>({})
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

    // Re-extract with the gap answer appended to the original description
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
      setExtracted(data)
      setDescription(combined)
      setGapAnswer("")

      if (data.missingFields.length > 0) {
        // Still missing — one more gap attempt, then proceed anyway
        setStep("step2")
      } else {
        setStep("step2")
      }
    } catch {
      setError("Something went wrong. Please try again.")
      setStep("gap")
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
        justifyContent: "center",
        padding: "2rem 1.5rem",
        fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "26rem" }}>

        {/* ── Header ───────────────────────────────────────────── */}
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

        {/* ── Step 1: Description + name ───────────────────────── */}
        {(step === "step1" || step === "extracting") && (
          <form onSubmit={handleStep1Submit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Orbit speech bubble — the one tailed bubble in the product */}
            <div style={{ position: "relative", marginBottom: "0.25rem" }}>
              {/* Tail pointing up at the header */}
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
                  border: "1px solid rgba(163,230,53,0.1)",
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
                  Tell me about your group — who you are, what you do together, and when you usually meet. I&rsquo;ll handle the rest.
                </p>
              </div>
            </div>

            {/* Description textarea */}
            <div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. We&rsquo;re a crew of 8 friends who go climbing every Monday and Wednesday morning at 8am at Crux gym."
                rows={4}
                style={{
                  width: "100%",
                  padding: "0.75rem",
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
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-lime)"
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = fieldErrors.description ? "#f87171" : "var(--border-subtle)"
                }}
              />
              {fieldErrors.description && (
                <p style={{ fontSize: "var(--type-meta)", color: "#f87171", marginTop: "0.25rem" }}>
                  {fieldErrors.description}
                </p>
              )}
            </div>

            {/* Founder name */}
            <div>
              <label
                htmlFor="founderName"
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
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-lime)"
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = fieldErrors.name ? "#f87171" : "var(--border-subtle)"
                }}
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
              disabled={step === "extracting"}
              style={{
                width: "100%",
                padding: "0.875rem 1.5rem",
                backgroundColor: step === "extracting" ? "var(--color-teal-hover)" : "var(--color-teal)",
                color: "#0a0a0a",
                fontSize: "var(--type-body)",
                fontWeight: 700,
                border: "none",
                borderRadius: "0.625rem",
                cursor: step === "extracting" ? "wait" : "pointer",
                marginTop: "0.25rem",
                transition: "background-color 0.15s ease, transform 0.1s ease",
                boxShadow: step === "extracting" ? "none" : "0 0 0 0 rgba(45,212,191,0)",
              }}
              onMouseEnter={(e) => {
                if (step !== "extracting") {
                  e.currentTarget.style.backgroundColor = "var(--color-teal-hover)"
                  e.currentTarget.style.transform = "translateY(-1px)"
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = step === "extracting" ? "var(--color-teal-hover)" : "var(--color-teal)"
                e.currentTarget.style.transform = "translateY(0)"
              }}
            >
              {step === "extracting" ? "Thinking…" : "Continue"}
            </button>
          </form>
        )}

        {/* ── Gap-ask: missing fields ───────────────────────────── */}
        {step === "gap" && extracted && (
          <form onSubmit={handleGapSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Orbit plays back what it got */}
            <div
              style={{
                backgroundColor: "var(--surface-orbit)",
                borderRadius: "4px 16px 16px 16px",
                padding: "0.875rem 1rem",
                border: "1px solid rgba(163,230,53,0.1)",
              }}
            >
              <p style={{ fontSize: "var(--type-body)", lineHeight: "var(--leading-normal)", color: "var(--text-primary)", margin: 0 }}>
                Got it — sounds like {extracted.groupName}!
              </p>
            </div>

            {/* Lime gap-ask prompt */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.625rem 0.875rem",
                backgroundColor: "rgba(163,230,53,0.08)",
                border: "1px solid rgba(163,230,53,0.2)",
                borderRadius: "0.5rem",
              }}
            >
              <span style={{ fontSize: "0.75rem", color: "var(--color-lime)", fontWeight: 700 }}>?</span>
              <p style={{ fontSize: "var(--type-meta)", color: "var(--color-lime)", margin: 0 }}>
                {extracted.missingFields.includes("daysOfWeek")
                  ? "What days do you usually meet?"
                  : "What time do you usually meet?"}
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
                color: "#0a0a0a",
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

            <button
              type="button"
              onClick={() => setStep("step2")}
              style={{
                width: "100%",
                padding: "0.625rem 1rem",
                backgroundColor: "transparent",
                color: "var(--text-secondary)",
                fontSize: "var(--type-meta)",
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer",
                marginTop: "-0.5rem",
              }}
            >
              Skip for now
            </button>
          </form>
        )}

        {/* ── Step 2: Playback + confirm ────────────────────────── */}
        {step === "step2" && extracted && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Orbit confirmation bubble */}
            <div
              style={{
                backgroundColor: "var(--surface-orbit)",
                borderRadius: "4px 16px 16px 16px",
                padding: "0.875rem 1rem",
                border: "1px solid rgba(163,230,53,0.1)",
              }}
            >
              <p style={{ fontSize: "var(--type-body)", lineHeight: "var(--leading-normal)", color: "var(--text-primary)", margin: 0 }}>
                Here&rsquo;s what I picked up. Does this look right?
              </p>
            </div>

            {/* Playback card */}
            <div
              style={{
                backgroundColor: "var(--surface-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "0.875rem",
                overflow: "hidden",
                boxShadow: "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)",
              }}
            >
              {/* Card body */}
              <div style={{ padding: "1.25rem 1.25rem 1rem" }}>
                <p
                  style={{
                    fontSize: "var(--type-heading)",
                    lineHeight: "var(--leading-tight)",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    marginBottom: "1rem",
                  }}
                >
                  {extracted.groupName}
                </p>

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

              {/* Teal footer action — the full-band primary per §7 */}
              <button
                onClick={handleConfirm}
                disabled={isPending}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "0.875rem 1.25rem",
                  backgroundColor: isPending ? "var(--color-teal-hover)" : "var(--color-teal)",
                  color: "#0a0a0a",
                  fontSize: "var(--type-body)",
                  fontWeight: 700,
                  border: "none",
                  cursor: isPending ? "wait" : "pointer",
                  textAlign: "center",
                  transition: "background-color 0.15s ease",
                  letterSpacing: "0.01em",
                }}
              >
                {isPending ? "Creating your group…" : "Looks right, set up invites"}
              </button>
            </div>

            {/* Edit link */}
            <button
              onClick={() => setStep("step1")}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                fontSize: "var(--type-meta)",
                cursor: "pointer",
                textAlign: "center",
                textDecoration: "underline",
                textUnderlineOffset: "2px",
              }}
            >
              Edit description
            </button>

            {error && (
              <p style={{ fontSize: "var(--type-meta)", color: "#f87171", textAlign: "center" }}>{error}</p>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PlaybackRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "baseline" }}>
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

function buildScheduleString(extracted: ExtractionResult): string {
  const parts: string[] = []
  if (extracted.daysOfWeek) {
    parts.push(formatDays(extracted.daysOfWeek))
  }
  if (extracted.timeLocal) {
    parts.push(`@ ${formatTimeLocal(extracted.timeLocal)}`)
  }
  return parts.join(" ") || "Schedule TBD"
}
