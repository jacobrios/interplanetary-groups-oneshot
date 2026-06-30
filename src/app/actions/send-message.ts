// src/app/actions/send-message.ts
"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth/current-user"
import { createMessage } from "@/lib/messages/create"
import { MessageAuthor } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { looksLikeSpark, hasOpenGauge, createGauge } from "@/lib/orbit/spark"
import { detectSpark } from "@/lib/orbit/extract"
import { parseRhythm } from "@/lib/orbit/rhythm"

export interface SendMessageState {
  errors?: {
    general?: string
  }
}

/**
 * Server action: post a member message to a group's feed.
 *
 * Auth model: re-verifies session via Supabase getUser(), resolves the User
 * row server-side — never trusts client-passed values.
 *
 * Spark detection (build-notes §5): after writing the member's message,
 * runs a keyword pre-filter. If positive, calls Anthropic to confirm intent.
 * If a spark is detected and no open gauge exists, creates an interest gauge.
 * The Anthropic call adds ~1-2s to the action; the optimistic message is
 * already visible to the sender, so the latency only delays Orbit's response.
 */
export async function sendMessageAction(
  _prevState: SendMessageState,
  formData: FormData
): Promise<SendMessageState> {
  const groupId = (formData.get("groupId") as string | null)?.trim() ?? ""
  const body = (formData.get("body") as string | null) ?? ""

  if (!groupId) {
    return { errors: { general: "Something went wrong. Please refresh and try again." } }
  }

  if (!body.trim()) {
    return { errors: { general: "Message cannot be empty." } }
  }

  const supabase = await createClient()
  const {
    data: { user: supabaseUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (!supabaseUser) {
    console.error("[send-message] no supabase user — authError:", authError?.message ?? "none")
    return { errors: { general: "You need to be signed in to send messages." } }
  }

  const user = await getCurrentUser()
  if (!user) {
    console.error("[send-message] supabase user found but no prisma user for supabaseAuthId:", supabaseUser.id)
    return { errors: { general: "You need to be signed in to send messages." } }
  }

  // Write the member's message
  try {
    await createMessage({
      groupId,
      authorType: MessageAuthor.MEMBER,
      authorId: user.id,
      body,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ""
    console.error("[send-message] createMessage failed:", msg, err)
    if (msg === "EMPTY_BODY") {
      return { errors: { general: "Message cannot be empty." } }
    }
    return { errors: { general: "Couldn't send that, try again." } }
  }

  // ── Spark detection ──────────────────────────────────────────────────────
  // Quick keyword pre-filter before the Anthropic call.
  if (looksLikeSpark(body)) {
    try {
      // Check if there's already an open gauge — skip if so.
      const alreadyGauging = await hasOpenGauge(groupId)
      if (!alreadyGauging) {
        // Fetch the group's activity context for better detection
        const group = await prisma.group.findUnique({
          where: { id: groupId },
          select: { recurringActivities: true },
        })
        const rhythm = group ? parseRhythm(group.recurringActivities) : null
        const groupActivity = rhythm?.activity ?? "hang out"

        const spark = await detectSpark(body, groupActivity)

        if (spark.isSpark && spark.confidence > 0.6) {
          await createGauge({
            groupId,
            initiatorId: user.id,
            initiatorName: user.name,
            activity: spark.activity ?? groupActivity,
          })
        }
      }
    } catch (err) {
      // Spark detection failure is non-fatal — member's message was already saved.
      console.error("[spark detection] error:", err)
    }
  }
  // ── End spark detection ──────────────────────────────────────────────────

  revalidatePath(`/groups/${groupId}`)
  return {}
}
