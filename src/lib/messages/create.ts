// src/lib/messages/create.ts
//
// Data-layer write for creating a single message in a group's feed.

import { prisma } from "@/lib/prisma"
import { MessageAuthor } from "@prisma/client"
import type { Message } from "@prisma/client"

export interface CreateMessageInput {
  groupId: string
  authorType: MessageAuthor
  /** The Prisma User.id of the member author.  Must be null for ORBIT messages. */
  authorId: string | null
  body: string
  /** Set when this ORBIT message is an interest-gauge prompt. */
  gaugeId?: string | null
}

/**
 * Persists a new message to the group's feed.
 *
 * Guards:
 * - Rejects blank bodies (trimmed empty string) with "EMPTY_BODY".
 * - For MEMBER messages, authorId must be provided (non-null).
 * - For ORBIT messages, authorId must be null.
 */
export async function createMessage({
  groupId,
  authorType,
  authorId,
  body,
  gaugeId = null,
}: CreateMessageInput): Promise<Message> {
  if (!body.trim()) {
    throw new Error("EMPTY_BODY")
  }

  return prisma.message.create({
    data: {
      groupId,
      authorType,
      authorId,
      body: body.trim(),
      gaugeId: gaugeId ?? null,
    },
  })
}
