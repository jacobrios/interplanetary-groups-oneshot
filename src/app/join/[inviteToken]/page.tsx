// src/app/join/[inviteToken]/page.tsx
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth/current-user"
import { parseRhythm } from "@/lib/orbit/rhythm"
import JoinForm from "./JoinForm"

interface Props {
  params: Promise<{ inviteToken: string }>
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function buildScheduleString(daysOfWeek: number[], timeLocal: string): string {
  const days = daysOfWeek.length === 1
    ? `${DAY_NAMES[daysOfWeek[0]]}s`
    : daysOfWeek.map((d) => DAY_NAMES[d]).join(" & ")
  const [h, m] = timeLocal.split(":").map(Number)
  const ampm = h < 12 ? "am" : "pm"
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  const timeStr = m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, "0")}${ampm}`
  const partOfDay = h < 12 ? "mornings" : h < 17 ? "afternoons" : "evenings"
  return `${days} ${partOfDay} @ ${timeStr}`
}

export default async function JoinPage({ params }: Props) {
  const { inviteToken } = await params
  const group = await prisma.group.findUnique({
    where: { inviteToken },
    include: { memberships: { select: { id: true } } },
  })

  if (!group) {
    return (
      <main
        style={{
          minHeight: "100dvh",
          backgroundColor: "var(--surface-page)",
          color: "var(--text-primary)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1.5rem",
          fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
        }}
      >
        <div style={{ width: "100%", maxWidth: "28rem" }}>
          <p
            style={{
              fontSize: "var(--type-eyebrow)",
              lineHeight: "var(--leading-normal)",
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "0.5rem",
            }}
          >
            Invite link
          </p>
          <p
            style={{
              fontSize: "var(--type-body)",
              lineHeight: "var(--leading-normal)",
              color: "var(--text-secondary)",
            }}
          >
            This invite link isn&apos;t valid. Ask whoever sent it to share it again.
          </p>
        </div>
      </main>
    )
  }

  const user = await getCurrentUser()
  const memberCount = group.memberships.length

  // Parse rhythm for the group info rows on the join screen
  const rhythm = parseRhythm(group.recurringActivities)
  const scheduleString = rhythm
    ? buildScheduleString(rhythm.daysOfWeek, rhythm.timeLocal)
    : null

  return (
    <JoinForm
      groupName={group.name}
      inviteToken={inviteToken}
      currentName={user?.name ?? null}
      memberCount={memberCount}
      activityLabel={rhythm?.activity ?? null}
      scheduleString={scheduleString}
    />
  )
}
