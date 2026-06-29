# DECISIONS.md · Interplanetary Groups

Live decision log for the gstack one-shot build. Entries are appended as decisions are made, not reconstructed at the end. For each: the decision, alternatives rejected, a one-line why, and how much deliberation it got (quick default vs. considered call).

---

## Onboarding

### Group name derived from description, not typed
**Decision:** Orbit extracts the group name from the founder's free-text description. There is no explicit "group name" text field.  
**Rejected:** A separate "Group name" text input (the current stub has this).  
**Why:** The designed flow in mockup-1 Step 1 is description-only with the founder's name. Typing a name separately would add a step that Orbit can handle. Matches the "Orbit handles the organizing burden" thesis.  
**Deliberation:** Quick default — this is clearly the designed intent from the mockup.

---

### Share step (Step 3) is in scope
**Decision:** After group creation, route to a `/create/share` page that shows the invite link prominently as the third step of onboarding.  
**Rejected:** Putting the share link directly on the group home. Considered: redirecting to `/groups/${id}?welcome=1` with a banner.  
**Why:** The mockup shows Step 3 explicitly as "Share the invite link" — a full dedicated screen. The share moment is a product milestone for the founder; it deserves its own step.  
**Deliberation:** Quick call — it's in the mockup.

---

### Timezone captured from browser in Step 1
**Decision:** `Intl.DateTimeFormat().resolvedOptions().timeZone` is read in the browser during Step 1 and passed as a hidden form field to the extraction call.  
**Rejected:** Asking the founder to pick a timezone explicitly; inferring from description.  
**Why:** Browser-inferred timezone is accurate for 99% of cases, requires zero founder input, and must be known to display the playback card correctly in Step 2. Asking explicitly would add friction for no gain.  
**Deliberation:** Quick default.

---

### Missing time/day → single gap-ask before proceeding
**Decision:** If Anthropic extraction returns `missingFields: ["timeLocal"]` or `["daysOfWeek"]`, the wizard stays on Step 1 and shows a focused clarifying prompt ("What time do you usually meet?" or "What days?"). The founder answers in the same text area and we re-extract.  
**Rejected:** Proceeding without a schedule (create group with no rhythm). Build-notes §5 says "ask if missing, don't guess" — this is a hard guardrail.  
**Why:** A group with no schedule gets no Orbit-created events on day one. The product's value (the home is alive on day one) depends on having a rhythm.  
**Deliberation:** Considered — the guardrail is explicit in build-notes §5.

---

### Onboarding is a single-page client wizard (no multi-route)
**Decision:** All three steps live at `/create`, managed by React `useState` for the current step. The group is created (server action) at the end of Step 2; Step 3 renders at `/create/share/[groupId]`.  
**Rejected:** Multi-route wizard at `/create/step-1`, `/create/step-2`, etc. Considered: URL state via searchParams.  
**Why:** Client state avoids back-button complexity and URL state management while keeping the wizard coherent. The share page needs its own URL because it's a shareable moment the founder lands on from the group home.  
**Deliberation:** Quick default.

---

### Extraction uses claude-haiku-4-5 (not claude-sonnet-4-6)
**Decision:** The Anthropic extraction call for onboarding uses `claude-haiku-4-5-20251001`.  
**Rejected:** claude-sonnet-4-6 (higher accuracy but 3-5x cost and latency).  
**Why:** Structured extraction from a short description is well within Haiku's capability. The onboarding prompt is simple and deterministic. Can upgrade if quality proves insufficient.  
**Deliberation:** Quick default.

---

## Spark flow

### Spark detection is Anthropic-powered (not regex-only)
**Decision:** When a MEMBER message passes a fast keyword pre-filter, an Anthropic call determines whether it's a spark (spontaneous event intent).  
**Rejected:** Pure regex matching; always calling Anthropic on every message.  
**Why:** Regex produces too many false positives/negatives for natural language intent. Always calling is expensive. The hybrid (keyword gate + Anthropic confirm) gives quality without cost on every message.  
**Deliberation:** Considered call — balancing quality and cost.

---

### Spark detection happens synchronously in the send-message action
**Decision:** The Anthropic spark-detection call runs inside the `sendMessageAction` server action, after the member's message is written. If a spark is detected, Orbit's gauge message is written before `revalidatePath`. The action takes ~2-3 seconds instead of ~500ms.  
**Rejected:** Fire-and-forget async (e.g., a separate webhook or queue). Requires WebSockets or polling for Orbit's response to appear without user refresh.  
**Why:** MVP simplicity. The optimistic member message appears instantly; the slight delay before `revalidatePath` refreshes the feed with Orbit's gauge is acceptable. No polling or WebSocket infra needed.  
**Deliberation:** Considered call — MVP simplicity over latency optimization.

---

### Gauge votes stored as GaugeVote rows (not message reactions)
**Decision:** `Gauge` and `GaugeVote` models in Prisma. Each chip tap creates a `GaugeVote` row with `@@unique([gaugeId, userId])`. Threshold is 3 IN votes (including initiator auto-vote).  
**Rejected:** Storing votes as special messages; storing votes as JSON in the gauge message.  
**Why:** Row-level storage is queryable (can derive counts), prevents double-voting via the unique constraint, and cleanly supports the auto-seed-RSVPs requirement (GaugeVote.IN → Rsvp.IN when event created).  
**Deliberation:** Quick default.

---

### Initiator auto-votes IN when gauge is created
**Decision:** When Orbit creates a gauge in response to a spark, the initiating member is automatically given a `GaugeVote` of IN. They don't need to tap the chip.  
**Why:** Build-notes §5 says "auto-seed RSVPs; never ask twice." The initiator expressed interest in their message; asking them to also tap a chip would violate this.  
**Deliberation:** Quick default — this is the spec.

---

## Timezone display fix

### format.ts signature updated to accept optional timezone
**Decision:** `formatEventDate` and `formatTime` gain an optional `timeZone: string` parameter (defaulting to `"UTC"`). All callers that have group context pass `group.timeZone`. `announce.ts` updated in lockstep.  
**Why:** Build-notes §11 flags this as CRITICAL COUPLING — timezone capture (onboarding writes `Group.timeZone`) and display fix must land in the same changeset. Shipping one without the other creates a visible calendar rendering bug.  
**Deliberation:** Quick default — the coupling is explicit in the spec.

---

## Visual polish

### Gradient page backgrounds + layered card depth
**Decision:** Page backgrounds use a subtle radial gradient (lime/teal tinted, very low opacity) over the dark base. Cards use a layered inner shadow + slightly brighter border on hover. Transitions on interactive elements (buttons, chips) use 150ms ease.  
**Rejected:** Flat-only dark (current state). Considered: full glassmorphism (too busy, violates minimalist bar).  
**Why:** The mockups show depth and richness the current flat theme doesn't match. Gradients at 3-5% opacity add presence without decoration.  
**Deliberation:** Considered — CLAUDE.md minimalist bar requires restraint. Every visual choice earns its place.

---

### No condensed event card after RSVP
**Decision:** Ship the full pinned card as drawn. Do not build the condensed post-RSVP state.  
**Why:** Build-notes §7 explicit open question: "do not build preemptively." This is a complexity-must-justify-itself call. The live app will tell us if it crowds the chat.  
**Deliberation:** Not a decision at all — following the explicit spec.

---

### Root route redirects to /create
**Decision:** `/` redirects to `/create` (the onboarding wizard). No landing page.  
**Rejected:** A marketing landing page; routing returning sessions to group home.  
**Why:** This is a portfolio MVP, not a launch product. The entry point is creating a group. A future fast-follow will detect an active session and route to group home instead; the backend is already group-aware per-session.  
**Deliberation:** Quick default.

---

### Leave group is a stub on group info
**Decision:** "Leave group" button renders for non-founder members but has no action wired up yet. It shows only for members with an active session.  
**Rejected:** Omitting the button entirely; implementing full leave logic.  
**Why:** Out of scope for MVP (no leave mechanic defined). The button's presence is correct product shape — a member should see it — but implementing it requires decisions about what happens to their RSVPs and messages that aren't made yet. Stub now, implement as a fast-follow.  
**Deliberation:** Quick call — standard "stub visible, defer logic" pattern for out-of-scope features.

---

## Bug fixes

### Empty home after onboarding: reconcile never fired at creation time
**Root cause:** `provisionFounderGroup` saves `recurringActivities` to the group row, but nothing calls `reconcileScheduledEvents` at that point. The only caller was the daily cron endpoint (`/api/cron/orbit`), so a new group would show "No upcoming events yet" until the cron fired — in local dev, never.  
**Fix:** `createGroupAction` now calls `reconcileScheduledEvents(new Date(), { groupId: group.id })` immediately after provision, narrowed to the new group so it doesn't touch other groups. `reconcileScheduledEvents` gained an optional `{ groupId }` filter for this. The call is wrapped in a non-fatal try/catch: if it fails, the group was still created and the cron will catch up.  
**Verified:** fresh test group with Mon/Wed/Fri 8am LA timezone rhythm → reconcile created the event and Orbit's announcement in one call → group home showed the event card.

---

*Entries continue to be appended live during the build.*
