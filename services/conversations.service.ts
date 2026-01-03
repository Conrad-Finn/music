/**
 * 对话服务 - Conversations Service
 *
 * 提供 AI 对话相关的 CRUD 操作
 * 遵循 real.md 约束:
 * - C2: 数据隔离 - 对话通过 userId 隔离
 * - C4: AI 日志脱敏 - 不记录敏感信息
 */

import { db } from '@/db';
import { conversations, messages } from '@/db/schema';
import { eq, desc, ilike, or, and, sql } from 'drizzle-orm';
import type { Conversation, NewConversation, Message, NewMessage } from '@/db/schema';

// ============================================================================
// 类型定义
// ============================================================================

export type ConversationPurpose = 'lyrics_parse' | 'card_generate' | 'chat';
export type MessageRole = 'user' | 'assistant' | 'system';

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface CreateConversationInput {
  userId: string;
  title: string;
  songId?: string;
  purpose?: ConversationPurpose;
  model?: string;
}

export interface UpdateConversationInput {
  title?: string;
  summary?: string;
  totalTokens?: number;
}

export interface CreateMessageInput {
  conversationId: string;
  role: MessageRole;
  content: string;
  tokens?: number;
  model?: string;
  finishReason?: string;
}

export interface ConversationsQueryOptions {
  userId: string;
  search?: string;
  purpose?: ConversationPurpose;
  songId?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// CRUD 操作 - 对话
// ============================================================================

/**
 * 创建对话
 */
export async function createConversation(
  input: CreateConversationInput
): Promise<Conversation> {
  const [conversation] = await db
    .insert(conversations)
    .values({
      userId: input.userId,
      title: input.title,
      songId: input.songId,
      metadata: {
        purpose: input.purpose || 'chat',
        model: input.model,
        totalTokens: 0,
      },
    })
    .returning();

  return conversation;
}

/**
 * 通过 ID 获取对话
 */
export async function getConversationById(id: string): Promise<Conversation | null> {
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
  });

  return conversation ?? null;
}

/**
 * 获取对话及其消息
 */
export async function getConversationWithMessages(
  id: string
): Promise<ConversationWithMessages | null> {
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
    with: {
      messages: {
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
      },
    },
  });

  return conversation ?? null;
}

/**
 * 验证对话所有权
 */
export async function verifyConversationOwnership(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const conversation = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, conversationId),
      eq(conversations.userId, userId)
    ),
  });

  return !!conversation;
}

/**
 * 查询用户的对话列表
 */
export async function getConversations(
  options: ConversationsQueryOptions
): Promise<{
  data: Conversation[];
  total: number;
}> {
  const { userId, search, purpose, songId, limit = 10, offset = 0 } = options;

  // 构建查询条件
  const conditions = [eq(conversations.userId, userId)];

  if (search) {
    conditions.push(
      or(
        ilike(conversations.title, `%${search}%`),
        ilike(conversations.summary, `%${search}%`)
      )!
    );
  }

  if (songId) {
    conditions.push(eq(conversations.songId, songId));
  }

  // 注意：purpose 存储在 JSONB 中，需要特殊处理
  // 这里简化处理，实际应该使用 JSON 操作符

  const whereCondition = and(...conditions);

  // 执行查询
  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(conversations)
      .where(whereCondition)
      .orderBy(desc(conversations.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversations)
      .where(whereCondition),
  ]);

  // 过滤 purpose（如果指定）
  let filteredData = data;
  if (purpose) {
    filteredData = data.filter((c) => c.metadata?.purpose === purpose);
  }

  return {
    data: filteredData,
    total: countResult[0]?.count ?? 0,
  };
}

/**
 * 更新对话
 */
export async function updateConversation(
  id: string,
  input: UpdateConversationInput
): Promise<Conversation | null> {
  const existing = await getConversationById(id);
  if (!existing) return null;

  const [conversation] = await db
    .update(conversations)
    .set({
      title: input.title ?? existing.title,
      summary: input.summary ?? existing.summary,
      metadata: {
        ...existing.metadata,
        totalTokens: input.totalTokens ?? existing.metadata?.totalTokens,
      },
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, id))
    .returning();

  return conversation ?? null;
}

/**
 * 删除对话
 */
export async function deleteConversation(id: string): Promise<boolean> {
  const result = await db.delete(conversations).where(eq(conversations.id, id));
  return (result.rowCount ?? 0) > 0;
}

// ============================================================================
// CRUD 操作 - 消息
// ============================================================================

/**
 * 创建消息
 */
export async function createMessage(input: CreateMessageInput): Promise<Message> {
  const [message] = await db
    .insert(messages)
    .values({
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      tokens: input.tokens,
      metadata: {
        model: input.model,
        finishReason: input.finishReason,
      },
    })
    .returning();

  // 更新对话的 token 总数
  if (input.tokens) {
    const conversation = await getConversationById(input.conversationId);
    if (conversation) {
      const currentTokens = conversation.metadata?.totalTokens ?? 0;
      await updateConversation(input.conversationId, {
        totalTokens: currentTokens + input.tokens,
      });
    }
  }

  return message;
}

/**
 * 获取对话的所有消息
 */
export async function getMessagesByConversationId(
  conversationId: string
): Promise<Message[]> {
  return db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: (messages, { asc }) => [asc(messages.createdAt)],
  });
}

/**
 * 通过 ID 获取消息
 */
export async function getMessageById(id: string): Promise<Message | null> {
  const message = await db.query.messages.findFirst({
    where: eq(messages.id, id),
  });

  return message ?? null;
}

/**
 * 删除消息
 */
export async function deleteMessage(id: string): Promise<boolean> {
  const result = await db.delete(messages).where(eq(messages.id, id));
  return (result.rowCount ?? 0) > 0;
}

// ============================================================================
// 便捷方法
// ============================================================================

/**
 * 开始新对话（创建对话 + 系统消息）
 */
export async function startConversation(
  input: CreateConversationInput,
  systemPrompt?: string
): Promise<ConversationWithMessages> {
  const conversation = await createConversation(input);

  const msgs: Message[] = [];

  // 添加系统提示（如果有）
  if (systemPrompt) {
    const systemMessage = await createMessage({
      conversationId: conversation.id,
      role: 'system',
      content: systemPrompt,
    });
    msgs.push(systemMessage);
  }

  return {
    ...conversation,
    messages: msgs,
  };
}

/**
 * 发送消息并获取回复（简化版，实际应集成 AI SDK）
 */
export async function sendMessage(
  conversationId: string,
  content: string,
  userId: string
): Promise<{ userMessage: Message; assistantMessage?: Message }> {
  // 验证所有权
  const isOwner = await verifyConversationOwnership(conversationId, userId);
  if (!isOwner) {
    throw new Error('Unauthorized');
  }

  // 创建用户消息
  const userMessage = await createMessage({
    conversationId,
    role: 'user',
    content,
  });

  // 注意：这里只创建用户消息
  // AI 回复应该由 AI SDK 在单独的 API 路由中处理
  // 这个方法可以扩展为包含 AI 回复逻辑

  return { userMessage };
}

/**
 * 获取用户最近的对话
 */
export async function getRecentConversations(
  userId: string,
  limit: number = 5
): Promise<Conversation[]> {
  return db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt))
    .limit(limit);
}

/**
 * 生成对话摘要
 */
export async function generateSummary(conversationId: string): Promise<string> {
  const msgs = await getMessagesByConversationId(conversationId);

  // 简单摘要：取第一条用户消息的前 100 字符
  const firstUserMessage = msgs.find((m) => m.role === 'user');
  if (firstUserMessage) {
    const summary = firstUserMessage.content.slice(0, 100);
    await updateConversation(conversationId, { summary });
    return summary;
  }

  return '';
}
