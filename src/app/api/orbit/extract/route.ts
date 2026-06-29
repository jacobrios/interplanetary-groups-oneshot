// src/app/api/orbit/extract/route.ts
//
// Server route: POST /api/orbit/extract
// Receives a founder's free-text description + name, calls Anthropic,
// returns structured extraction for the onboarding wizard Step 2 playback.
//
// This keeps the Anthropic API key entirely server-side (never NEXT_PUBLIC_).
// Called from the /create client wizard after Step 1 submission.

import { NextResponse } from "next/server"
import { extractGroupRhythm } from "@/lib/orbit/extract"

export async function POST(request: Request) {
  try {
    const body = await request.json() as { description: string; founderName: string }

    if (!body.description?.trim() || !body.founderName?.trim()) {
      return NextResponse.json(
        { error: "description and founderName are required" },
        { status: 400 }
      )
    }

    const result = await extractGroupRhythm(body.description.trim(), body.founderName.trim())
    return NextResponse.json(result)
  } catch (err) {
    console.error("[orbit/extract] error:", err)
    return NextResponse.json(
      { error: "Extraction failed" },
      { status: 500 }
    )
  }
}
