// src/app/actions/create-group.ts
"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { provisionFounderGroup } from "@/lib/groups/provision"
import { reconcileScheduledEvents } from "@/lib/orbit/reconcile"

export interface CreateGroupState {
  errors?: {
    founderName?: string
    groupName?: string
    general?: string
  }
}

/**
 * Creates a group with extracted rhythm data from the onboarding wizard.
 *
 * Accepts structured rhythm fields from the Anthropic extraction step.
 * The founder's session is minted here (or reused if one exists) — same
 * auth pattern as the original stub.
 */
export async function createGroupAction(
  _prevState: CreateGroupState,
  formData: FormData
): Promise<CreateGroupState> {
  const founderName = (formData.get("founderName") as string | null)?.trim() ?? ""
  const groupName = (formData.get("groupName") as string | null)?.trim() ?? ""
  const timeZone = (formData.get("timeZone") as string | null)?.trim() || "UTC"

  // Optional rhythm fields from the extraction step
  const activity = (formData.get("activity") as string | null)?.trim() || null
  const daysOfWeekRaw = formData.get("daysOfWeek") as string | null
  const timeLocal = (formData.get("timeLocal") as string | null)?.trim() || null
  const durationMinutesRaw = formData.get("durationMinutes") as string | null

  const errors: CreateGroupState["errors"] = {}
  if (!founderName) errors.founderName = "Your name is required."
  if (!groupName) errors.groupName = "Group name is required."
  if (Object.keys(errors).length > 0) return { errors }

  const supabase = await createClient()

  let {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error || !data.user) {
      return {
        errors: { general: "Could not create a session. Please try again." },
      }
    }
    user = data.user
  }

  // Build recurringActivities rhythm if we have enough structured data
  let recurringActivities: unknown = null
  if (activity && daysOfWeekRaw && timeLocal) {
    const daysOfWeek = JSON.parse(daysOfWeekRaw) as number[]
    const durationMinutes = durationMinutesRaw ? parseInt(durationMinutesRaw, 10) : null
    recurringActivities = [
      {
        activity,
        title: `${groupName} ${activity}`,
        daysOfWeek,
        timeLocal,
        cadence: "weekly",
        durationMinutes: isNaN(durationMinutes ?? NaN) ? null : durationMinutes,
      },
    ]
  }

  let group: Awaited<ReturnType<typeof provisionFounderGroup>>["group"]
  try {
    const result = await provisionFounderGroup({
      supabaseAuthId: user.id,
      founderName,
      groupName,
      timeZone,
      recurringActivities,
    })
    group = result.group
  } catch {
    return {
      errors: { general: "Something went wrong creating your group. Please try again." },
    }
  }

  // Immediately seed the first upcoming event so the group home is alive on day
  // one. The cron runs daily but fires for the first time only after group
  // creation, which would leave the home showing "No upcoming events yet" until
  // tomorrow. Narrowing to this group avoids touching other groups.
  if (recurringActivities) {
    try {
      await reconcileScheduledEvents(new Date(), { groupId: group.id })
    } catch (err) {
      // Non-fatal: the group was created successfully. The cron will catch up.
      console.error("[create-group] post-provision reconcile failed:", err)
    }
  }

  redirect(`/create/share/${group.id}`)
}
