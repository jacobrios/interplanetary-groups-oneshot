// src/app/groups/[id]/MessageFeed.tsx
"use client"

// Pure display component for the scrollable chat feed.
// Receives its message list from the parent GroupHome island.
//
// Chat voice system per build-notes §7:
// - Orbit: lime avatar (no name label), --surface-orbit fill.
// - Other member: name label (no avatar), outlined low-fill bubble.
// - Viewer (self): right-aligned, --surface-self (strongest neutral, not teal, not lime).
//
// Gauge chips: ORBIT messages with a gauge attached render interest-gauge
// chips below the bubble (IN / MAYBE / OUT). Chip taps call gaugeVoteAction.

import { MessageAuthor, GaugeResponse } from "@prisma/client"
import { useRef, useEffect, useTransition } from "react"
import { gaugeVoteAction } from "@/app/actions/gauge-vote"
import OrbitAvatar from "@/components/OrbitAvatar"

export interface GaugeData {
  id: string
  body: string
  inCount: number
  maybeCount: number
  viewerVote: GaugeResponse | null
  closedAt: Date | null
  eventId: string | null
}

export interface FeedMessage {
  id: string
  authorType: MessageAuthor
  authorId: string | null
  authorName: string | null
  body: string
  createdAt: Date
  gauge?: GaugeData | null
  isPending?: boolean
}

interface Props {
  messages: FeedMessage[]
  viewerId: string | null
}

export default function MessageFeed({ messages, viewerId }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView()
  }, [messages.length])

  if (messages.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1.5rem",
        }}
      >
        <p
          style={{
            fontSize: "var(--type-meta)",
            lineHeight: "var(--leading-normal)",
            color: "var(--text-placeholder)",
            textAlign: "center",
          }}
        >
          The conversation starts here.
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        padding: "1rem 1rem 0.5rem",
      }}
    >
      {messages.map((msg) => {
        const isOrbit = msg.authorType === MessageAuthor.ORBIT
        const isSelf = !isOrbit && viewerId !== null && msg.authorId === viewerId

        return (
          <div
            key={msg.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: isOrbit ? "flex-start" : isSelf ? "flex-end" : "flex-start",
              opacity: msg.isPending ? 0.65 : 1,
              transition: "opacity 0.15s ease",
            }}
          >
            {/* Orbit: lime avatar + muted fill, no name label */}
            {isOrbit && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "85%" }}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem" }}>
                  <OrbitAvatar size={28} />
                  <div
                    style={{
                      backgroundColor: "var(--surface-orbit)",
                      borderRadius: "4px 16px 16px 16px",
                      padding: "0.5rem 0.75rem",
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
                      {msg.body}
                    </p>
                  </div>
                </div>

                {/* Interest gauge chips — shown below Orbit's gauge message */}
                {msg.gauge && (
                  <GaugeChips
                    gauge={msg.gauge}
                    viewerId={viewerId}
                    messageId={msg.id}
                  />
                )}
              </div>
            )}

            {/* Other member: name label above, outlined low-fill */}
            {!isOrbit && !isSelf && (
              <div style={{ maxWidth: "80%" }}>
                <p
                  style={{
                    fontSize: "var(--type-eyebrow)",
                    lineHeight: "var(--leading-normal)",
                    color: "var(--text-secondary)",
                    marginBottom: "0.25rem",
                  }}
                >
                  {msg.authorName ?? "Member"}
                </p>
                <div
                  style={{
                    backgroundColor: "var(--surface-bubble-member)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "4px 16px 16px 16px",
                    padding: "0.5rem 0.75rem",
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
                    {msg.body}
                  </p>
                </div>
              </div>
            )}

            {/* Self (viewer): right-aligned, strongest neutral fill */}
            {isSelf && (
              <div style={{ maxWidth: "80%" }}>
                <div
                  style={{
                    backgroundColor: "var(--surface-self)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "16px 4px 16px 16px",
                    padding: "0.5rem 0.75rem",
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
                    {msg.body}
                  </p>
                </div>
              </div>
            )}
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}

// OrbitAvatar imported from @/components/OrbitAvatar — replaces the former
// local lime circle placeholder. 28px slot, mark renders at 156% (overflows).

// ─── Interest gauge chips ─────────────────────────────────────────────────────

function GaugeChips({
  gauge,
  viewerId,
  messageId: _messageId,
}: {
  gauge: GaugeData
  viewerId: string | null
  messageId: string
}) {
  const [isPending, startTransition] = useTransition()

  const isClosed = !!gauge.closedAt
  const viewerVote = gauge.viewerVote

  function vote(response: GaugeResponse) {
    if (!viewerId || isClosed || isPending) return
    startTransition(async () => {
      const fd = new FormData()
      fd.set("gaugeId", gauge.id)
      fd.set("response", response)
      await gaugeVoteAction({}, fd)
    })
  }

  if (isClosed && gauge.eventId) {
    return (
      <div
        style={{
          marginLeft: "2.25rem",
          padding: "0.375rem 0.625rem",
          backgroundColor: "rgba(45,212,191,0.08)",
          border: "1px solid rgba(45,212,191,0.2)",
          borderRadius: "0.5rem",
          display: "inline-block",
        }}
      >
        <p style={{ fontSize: "var(--type-meta)", color: "var(--color-teal)", margin: 0 }}>
          Event created! Check the card above.
        </p>
      </div>
    )
  }

  // Two chips per mockup (no MAYBE chip rendered): "Stoked this exists 🎉" and "I'm out"
  const chips: { label: string; response: GaugeResponse; activeColor: string }[] = [
    {
      label: `Stoked this exists 🎉${gauge.inCount > 0 ? ` · ${gauge.inCount}` : ""}`,
      response: GaugeResponse.IN,
      activeColor: "var(--color-teal)",
    },
    { label: "I'm out", response: GaugeResponse.OUT, activeColor: "var(--text-secondary)" },
  ]

  return (
    <div
      style={{
        marginLeft: "2.25rem",
        display: "flex",
        gap: "0.5rem",
        flexWrap: "wrap",
      }}
    >
      {chips.map((chip) => {
        const isActive = viewerVote === chip.response
        return (
          <button
            key={chip.response}
            onClick={() => vote(chip.response)}
            disabled={!viewerId || isClosed || isPending}
            style={{
              padding: "0.375rem 0.75rem",
              backgroundColor: isActive ? "transparent" : "rgba(255,255,255,0.04)",
              border: `1px solid ${isActive ? chip.activeColor : "var(--border-subtle)"}`,
              borderRadius: "999px",
              color: isActive ? chip.activeColor : "var(--text-secondary)",
              fontSize: "var(--type-meta)",
              fontWeight: isActive ? 600 : 400,
              cursor: viewerId && !isClosed ? "pointer" : "default",
              transition: "all 0.15s ease",
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {chip.label}
          </button>
        )
      })}
    </div>
  )
}
