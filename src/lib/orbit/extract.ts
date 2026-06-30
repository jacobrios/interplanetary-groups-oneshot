// src/lib/orbit/extract.ts
//
// Structured extraction of group rhythm from a founder's free-text description.
// Uses the Anthropic API (claude-haiku-4-5) to extract a GroupRhythm-shaped
// object plus any missing fields that require a gap-ask.
//
// This is Level 1 AI (prompt engineering, no RAG) per build-notes §7.
// The extracted structure is deterministically formatted by the UI —
// Orbit does not compose display copy here.

import Anthropic from "@anthropic-ai/sdk"

export interface ExtractionResult {
  groupName: string
  activity: string
  daysOfWeek: number[] | null   // null means couldn't determine
  timeLocal: string | null       // "HH:mm" 24h, null means couldn't determine
  durationMinutes: number | null
  missingFields: ("daysOfWeek" | "timeLocal")[]
}

const EXTRACTION_SYSTEM = `You are Orbit, an AI coordinator for casual recurring groups.
A founder is describing their group. Extract structured information from their description.
Always respond with valid JSON matching the schema exactly.`

const EXTRACTION_PROMPT = (description: string, founderName: string) => `
Founder name: ${founderName}
Group description: ${description}

Extract the following and respond with JSON only (no markdown, no explanation):
{
  "groupName": "short fun name derived from the description (max 3 words, title case)",
  "activity": "activity noun in lowercase (e.g. climbing, beers, yoga, running)",
  "daysOfWeek": [array of integers 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat, or null if cannot determine],
  "timeLocal": "HH:mm in 24-hour format (e.g. 08:00, 19:30), or null if cannot determine",
  "durationMinutes": integer duration in minutes or null,
  "missingFields": [array of field names that were null above, e.g. ["timeLocal"] or []]
}

Rules:
- If the description doesn't mention specific days, set daysOfWeek to null and include "daysOfWeek" in missingFields.
- If no time is mentioned, set timeLocal to null and include "timeLocal" in missingFields.
- The group name should reflect who they are and what they do (e.g. "Thursday Climbers", "Friday Beer Crew", "Morning Runners").
- Do not include "cadence" — assume weekly for all groups.
`.trim()

let _client: Anthropic | null = null

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set")
    _client = new Anthropic({ apiKey })
  }
  return _client
}

/**
 * Extracts a structured GroupRhythm-compatible object from a founder's
 * free-text group description.
 *
 * Never called from the browser — only from Server Actions and API routes.
 */
export async function extractGroupRhythm(
  description: string,
  founderName: string
): Promise<ExtractionResult> {
  const client = getClient()

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: EXTRACTION_SYSTEM,
    messages: [
      {
        role: "user",
        content: EXTRACTION_PROMPT(description, founderName),
      },
    ],
  })

  const raw = response.content[0]
  if (raw.type !== "text") {
    throw new Error("Unexpected response type from Anthropic")
  }

  // Strip markdown code fences if present (defensive)
  const text = raw.text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim()

  let parsed: ExtractionResult
  try {
    parsed = JSON.parse(text) as ExtractionResult
  } catch {
    throw new Error(`Failed to parse extraction response: ${text.slice(0, 200)}`)
  }

  // Normalize: ensure missingFields is always an array containing only the
  // two defined required fields. The model occasionally includes durationMinutes
  // or other keys; strip those so they don't trigger a false gap-ask.
  if (!Array.isArray(parsed.missingFields)) {
    parsed.missingFields = []
  }
  parsed.missingFields = (parsed.missingFields as string[]).filter(
    (f): f is "daysOfWeek" | "timeLocal" => f === "daysOfWeek" || f === "timeLocal"
  )

  return parsed
}

// ── Spark detection ───────────────────────────────────────────────────────────

export interface SparkResult {
  isSpark: boolean
  activity: string | null
  confidence: number
}

const SPARK_SYSTEM = `You are Orbit, detecting spontaneous event intent in a group chat message.
Always respond with valid JSON matching the schema exactly.`

const SPARK_PROMPT = (message: string, groupActivity: string) => `
Group activity context: ${groupActivity}
Message: "${message}"

Does this message suggest someone wants to do an activity together soon or spontaneously?
Examples of sparks: "who wants to climb tomorrow?", "anyone up for beers this Friday?", "we should finally meet up", "I'm free this weekend if anyone wants to hike"
Not sparks: logistics questions, RSVPs to existing events, general chit-chat

Respond with JSON only:
{
  "isSpark": true or false,
  "activity": "activity noun if spark, or null",
  "confidence": 0.0 to 1.0
}
`.trim()

/**
 * Returns whether a member message is a spontaneous event spark.
 * Only called when the message passes a keyword pre-filter (see send-message action).
 *
 * Uses a lightweight model (Haiku) for low latency.
 */
export async function detectSpark(
  message: string,
  groupActivity: string
): Promise<SparkResult> {
  const client = getClient()

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 128,
    system: SPARK_SYSTEM,
    messages: [
      {
        role: "user",
        content: SPARK_PROMPT(message, groupActivity),
      },
    ],
  })

  const raw = response.content[0]
  if (raw.type !== "text") {
    return { isSpark: false, activity: null, confidence: 0 }
  }

  const text = raw.text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim()

  try {
    const parsed = JSON.parse(text) as SparkResult
    return {
      isSpark: !!parsed.isSpark,
      activity: parsed.activity ?? null,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
    }
  } catch {
    return { isSpark: false, activity: null, confidence: 0 }
  }
}
