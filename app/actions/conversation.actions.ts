'use server';

/**
 * Conversation Server Actions
 *
 * 提供对话和消息的 CRUD 操作
 * 使用 Server Actions 模式，可直接从客户端组件调用
 */

import { db } from '@/db';
import { conversations, messages, type NewConversation, type NewMessage } from '@/db/schema';
import { eq, desc, ilike, or, and, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// ============================================================================
// 类型定义
// ============================================================================

export interface ConversationWithMessages {
  id: string;
  userId: string;
  title: string;
  summary: string | null;
  songId: string | null;
  metadata: {
    model?: string;
    totalTokens?: number;
    purpose?: 'lyrics_parse' | 'card_generate' | 'chat';
  } | null;
  createdAt: Date;
  updatedAt: Date;
  messages?: MessageData[];
}

export interface MessageData {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens: number | null;
  metadata: {
    model?: string;
    finishReason?: string;
  } | null;
  createdAt: Date;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// Conversation Actions
// ============================================================================

/**
 * 获取对话列表（分页 + 搜索）
 */
export async function getConversations(options: {
  userId: string;
  page?: number;
  limit?: number;
  q?: string;
}): Promise<PaginatedResult<ConversationWithMessages>> {
  const { userId, page = 1, limit = 10, q } = options;
  const offset = (page - 1) * limit;

  // 构建查询条件
  const conditions = [eq(conversations.userId, userId)];
  if (q) {
    conditions.push(
      or(
        ilike(conversations.title, `%${q}%`),
        ilike(conversations.summary, `%${q}%`)
      )!
    );
  }

  // 查询数据
  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(conversations)
      .where(and(...conditions))
      .orderBy(desc(conversations.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversations)
      .where(and(...conditions)),
  ]);

  const total = countResult[0]?.count ?? 0;

  return {
    data: data as ConversationWithMessages[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 获取单个对话（可选包含消息）
 */
export async function getConversationById(
  id: string,
  options: { includeMessages?: boolean } = {}
): Promise<ConversationWithMessages | null> {
  const { includeMessages = false } = options;

  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
    with: includeMessages ? { messages: { orderBy: [messages.createdAt] } } : undefined,
  });

  if (!conversation) return null;

  return conversation as ConversationWithMessages;
}

/**
 * 创建对话
 */
export async function createConversation(
  data: Omit<NewConversation, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ConversationWithMessages> {
  const [created] = await db
    .insert(conversations)
    .values(data)
    .returning();

  revalidatePath('/conversations');
  return created as ConversationWithMessages;
}

/**
 * 更新对话
 */
export async function updateConversation(
  id: string,
  data: Partial<Pick<NewConversation, 'title' | 'summary' | 'metadata'>>
): Promise<ConversationWithMessages | null> {
  const [updated] = await db
    .update(conversations)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(conversations.id, id))
    .returning();

  if (!updated) return null;

  revalidatePath('/conversations');
  revalidatePath(`/conversations/${id}`);
  return updated as ConversationWithMessages;
}

/**
 * 删除对话
 */
export async function deleteConversation(id: string): Promise<boolean> {
  const result = await db
    .delete(conversations)
    .where(eq(conversations.id, id))
    .returning({ id: conversations.id });

  revalidatePath('/conversations');
  return result.length > 0;
}

// ============================================================================
// Message Actions
// ============================================================================

/**
 * 获取对话的所有消息
 */
export async function getMessages(conversationId: string): Promise<MessageData[]> {
  const data = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  return data as MessageData[];
}

/**
 * 添加消息到对话
 */
export async function addMessage(
  data: Omit<NewMessage, 'id' | 'createdAt'>
): Promise<MessageData> {
  const [created] = await db
    .insert(messages)
    .values(data)
    .returning();

  // 更新对话的 updatedAt
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, data.conversationId));

  revalidatePath(`/conversations/${data.conversationId}`);
  return created as MessageData;
}

/**
 * 批量添加消息
 */
export async function addMessages(
  conversationId: string,
  messagesData: Array<Omit<NewMessage, 'id' | 'createdAt' | 'conversationId'>>
): Promise<MessageData[]> {
  const dataToInsert = messagesData.map((msg) => ({
    ...msg,
    conversationId,
  }));

  const created = await db
    .insert(messages)
    .values(dataToInsert)
    .returning();

  // 更新对话的 updatedAt
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  revalidatePath(`/conversations/${conversationId}`);
  return created as MessageData[];
}

/**
 * 删除消息
 */
export async function deleteMessage(id: string): Promise<boolean> {
  const result = await db
    .delete(messages)
    .where(eq(messages.id, id))
    .returning({ id: messages.id, conversationId: messages.conversationId });

  if (result.length > 0) {
    revalidatePath(`/conversations/${result[0].conversationId}`);
  }

  return result.length > 0;
}
