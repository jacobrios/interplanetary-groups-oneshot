// src/app/actions/gauge-vote.ts
"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth/current-user"
import { castGaugeVote } from "@/lib/orbit/spark"
import { GaugeResponse } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export interface GaugeVoteState {
  errors?: { general?: string }
}

/**
 * Server action: cast a vote on an interest gauge.
 *
 * Validates the session, maps the response string to GaugeResponse enum,
 * delegates to castGaugeVote (which handles threshold check and event creation).
 */
export async function gaugeVoteAction(
  _prevState: GaugeVoteState,
  formData: FormData
): Promise<GaugeVoteState> {
  const gaugeId = (formData.get("gaugeId") as string | null)?.trim() ?? ""
  const responseRaw = (formData.get("response") as string | null)?.trim().toUpperCase() ?? ""

  if (!gaugeId || !responseRaw) {
    return { errors: { general: "Invalid vote data." } }
  }

  const response = responseRaw as GaugeResponse
  if (!Object.values(GaugeResponse).includes(response)) {
    return { errors: { general: "Invalid vote response." } }
  }

  const supabase = await createClient()
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser()
  if (!supabaseUser) {
    return { errors: { general: "You need to be signed in to vote." } }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { errors: { general: "You need to be signed in to vote." } }
  }

  try {
    await castGaugeVote({ gaugeId, userId: user.id, response })
  } catch (err) {
    console.error("[gauge-vote] error:", err)
    return { errors: { general: "Couldn't record your vote. Please try again." } }
  }

  // Revalidate the group page so the updated gauge and any new event appear
  const gauge = await prisma.gauge.findUnique({
    where: { id: gaugeId },
    select: { groupId: true },
  })
  if (gauge) {
    revalidatePath(`/groups/${gauge.groupId}`)
  }

  return {}
}
