/**
 * 词卡服务 - Cards Service
 *
 * 提供词卡相关的 CRUD 操作
 * 遵循 real.md 约束:
 * - C2: 数据隔离 - 学习进度通过 userId 隔离
 * - C7: 无压迫性反馈 - 仅记录必要信息
 */

import { db } from '@/db';
import { cards, cardProgress, lines, songs } from '@/db/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import type {
  Card,
  NewCard,
  CardProgress,
  NewCardProgress,
  Line,
} from '@/db/schema';

// ============================================================================
// 类型定义
// ============================================================================

export type CardStatus = 'new' | 'learning' | 'mastered';

export interface CardWithProgress extends Card {
  progress?: CardProgress;
  line?: Line;
}

export interface CreateCardInput {
  lineId: string;
  word: string;
  reading?: string;
  meaning: string;
  partOfSpeech?: 'noun' | 'verb' | 'adjective' | 'adverb' | 'particle' | 'other';
  exampleSentence?: string;
  exampleTranslation?: string;
  audioClipUrl?: string;
  wordPosition?: { start: number; end: number };
}

export interface UpdateCardInput {
  word?: string;
  reading?: string;
  meaning?: string;
  partOfSpeech?: 'noun' | 'verb' | 'adjective' | 'adverb' | 'particle' | 'other';
  exampleSentence?: string;
  exampleTranslation?: string;
}

export interface CardsQueryOptions {
  userId?: string;
  status?: CardStatus;
  songId?: string;
  lineId?: string;
  limit?: number;
  offset?: number;
}

export interface CardStats {
  total: number;
  new: number;
  learning: number;
  mastered: number;
}

// ============================================================================
// CRUD 操作
// ============================================================================

/**
 * 创建词卡
 */
export async function createCard(input: CreateCardInput): Promise<Card> {
  const [card] = await db
    .insert(cards)
    .values({
      lineId: input.lineId,
      word: input.word,
      reading: input.reading,
      meaning: input.meaning,
      partOfSpeech: input.partOfSpeech || 'other',
      exampleSentence: input.exampleSentence,
      exampleTranslation: input.exampleTranslation,
      audioClipUrl: input.audioClipUrl,
      wordPosition: input.wordPosition,
    })
    .returning();

  return card;
}

/**
 * 通过 ID 获取词卡
 */
export async function getCardById(id: string): Promise<Card | null> {
  const card = await db.query.cards.findFirst({
    where: eq(cards.id, id),
  });

  return card ?? null;
}

/**
 * 获取词卡及其用户进度
 */
export async function getCardWithProgress(
  cardId: string,
  userId: string
): Promise<CardWithProgress | null> {
  const card = await db.query.cards.findFirst({
    where: eq(cards.id, cardId),
    with: {
      line: true,
      progress: {
        where: eq(cardProgress.userId, userId),
        limit: 1,
      },
    },
  });

  if (!card) return null;

  return {
    ...card,
    progress: card.progress?.[0],
    line: card.line,
  };
}

/**
 * 查询词卡列表
 */
export async function getCards(options: CardsQueryOptions = {}): Promise<{
  data: CardWithProgress[];
  total: number;
}> {
  const { userId, status, songId, lineId, limit = 10, offset = 0 } = options;

  // 基础查询
  let query = db
    .select({
      card: cards,
      progress: cardProgress,
    })
    .from(cards)
    .leftJoin(lines, eq(cards.lineId, lines.id))
    .leftJoin(songs, eq(lines.songId, songs.id));

  // 如果有用户 ID，关联进度表
  if (userId) {
    // @ts-expect-error - 动态添加 leftJoin 导致类型不兼容
    query = query.leftJoin(
      cardProgress,
      and(eq(cardProgress.cardId, cards.id), eq(cardProgress.userId, userId))
    );
  }

  // 构建条件
  const conditions = [];

  if (lineId) {
    conditions.push(eq(cards.lineId, lineId));
  }

  if (songId) {
    conditions.push(eq(lines.songId, songId));
  }

  if (status && userId) {
    conditions.push(eq(cardProgress.status, status));
  }

  const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

  // 执行查询
  const data = await db
    .select({
      card: cards,
      line: lines,
    })
    .from(cards)
    .leftJoin(lines, eq(cards.lineId, lines.id))
    .where(whereCondition)
    .orderBy(desc(cards.createdAt))
    .limit(limit)
    .offset(offset);

  // 获取总数
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(cards)
    .leftJoin(lines, eq(cards.lineId, lines.id))
    .where(whereCondition);

  // 如果有用户 ID，获取进度
  let progressMap: Record<string, CardProgress> = {};
  if (userId && data.length > 0) {
    const cardIds = data.map((d) => d.card.id);
    const progressData = await db
      .select()
      .from(cardProgress)
      .where(
        and(eq(cardProgress.userId, userId), inArray(cardProgress.cardId, cardIds))
      );
    progressMap = Object.fromEntries(progressData.map((p) => [p.cardId, p]));
  }

  return {
    data: data.map((d) => ({
      ...d.card,
      line: d.line ?? undefined,
      progress: progressMap[d.card.id],
    })),
    total: countResult[0]?.count ?? 0,
  };
}

/**
 * 更新词卡
 */
export async function updateCard(
  id: string,
  input: UpdateCardInput
): Promise<Card | null> {
  const [card] = await db.update(cards).set(input).where(eq(cards.id, id)).returning();

  return card ?? null;
}

/**
 * 删除词卡
 */
export async function deleteCard(id: string): Promise<boolean> {
  const result = await db.delete(cards).where(eq(cards.id, id));
  return (result.rowCount ?? 0) > 0;
}

// ============================================================================
// 学习进度操作
// ============================================================================

/**
 * 获取或创建用户的词卡进度
 */
export async function getOrCreateProgress(
  userId: string,
  cardId: string
): Promise<CardProgress> {
  // 先查询是否存在
  const existing = await db.query.cardProgress.findFirst({
    where: and(eq(cardProgress.userId, userId), eq(cardProgress.cardId, cardId)),
  });

  if (existing) return existing;

  // 创建新进度
  const [progress] = await db
    .insert(cardProgress)
    .values({
      userId,
      cardId,
      status: 'new',
      reviewCount: 0,
    })
    .returning();

  return progress;
}

/**
 * 更新学习状态
 */
export async function updateCardStatus(
  userId: string,
  cardId: string,
  status: CardStatus
): Promise<CardProgress> {
  // 确保进度记录存在
  await getOrCreateProgress(userId, cardId);

  // 更新状态
  const [progress] = await db
    .update(cardProgress)
    .set({
      status,
      reviewCount: sql`${cardProgress.reviewCount} + 1`,
      lastReviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(cardProgress.userId, userId), eq(cardProgress.cardId, cardId)))
    .returning();

  return progress;
}

/**
 * 获取用户的词卡统计
 */
export async function getCardStats(userId: string): Promise<CardStats> {
  const stats = await db
    .select({
      status: cardProgress.status,
      count: sql<number>`count(*)::int`,
    })
    .from(cardProgress)
    .where(eq(cardProgress.userId, userId))
    .groupBy(cardProgress.status);

  const result: CardStats = {
    total: 0,
    new: 0,
    learning: 0,
    mastered: 0,
  };

  for (const stat of stats) {
    result[stat.status] = stat.count;
    result.total += stat.count;
  }

  return result;
}

/**
 * 获取用户按歌曲分组的词卡
 */
export async function getCardsBySong(
  userId: string,
  songId: string
): Promise<CardWithProgress[]> {
  const result = await db
    .select({
      card: cards,
      line: lines,
      progress: cardProgress,
    })
    .from(cards)
    .innerJoin(lines, eq(cards.lineId, lines.id))
    .leftJoin(
      cardProgress,
      and(eq(cardProgress.cardId, cards.id), eq(cardProgress.userId, userId))
    )
    .where(eq(lines.songId, songId))
    .orderBy(lines.lineNumber);

  return result.map((r) => ({
    ...r.card,
    line: r.line,
    progress: r.progress ?? undefined,
  }));
}

/**
 * 获取待复习的词卡（学习中状态）
 */
export async function getCardsForReview(
  userId: string,
  limit: number = 10
): Promise<CardWithProgress[]> {
  const result = await db
    .select({
      card: cards,
      line: lines,
      progress: cardProgress,
    })
    .from(cardProgress)
    .innerJoin(cards, eq(cardProgress.cardId, cards.id))
    .innerJoin(lines, eq(cards.lineId, lines.id))
    .where(and(eq(cardProgress.userId, userId), eq(cardProgress.status, 'learning')))
    .orderBy(cardProgress.lastReviewedAt)
    .limit(limit);

  return result.map((r) => ({
    ...r.card,
    line: r.line,
    progress: r.progress,
  }));
}
