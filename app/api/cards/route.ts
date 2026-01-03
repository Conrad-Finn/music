/**
 * 词卡 API 路由
 *
 * GET /api/cards - 获取词卡列表
 * POST /api/cards - 创建新词卡
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { cards, lines, songs, cardProgress } from '@/db/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { createCard, type CreateCardInput } from '@/services/cards.service';

// 请求验证 Schema
const createCardSchema = z.object({
  lineId: z.string().uuid(),
  word: z.string().min(1).max(100),
  reading: z.string().max(100).optional(),
  meaning: z.string().min(1),
  partOfSpeech: z
    .enum(['noun', 'verb', 'adjective', 'adverb', 'particle', 'other'])
    .optional(),
  exampleSentence: z.string().optional(),
  exampleTranslation: z.string().optional(),
  audioClipUrl: z.string().url().optional(),
  wordPosition: z
    .object({
      start: z.number(),
      end: z.number(),
    })
    .optional(),
});

const querySchema = z.object({
  status: z.enum(['new', 'learning', 'mastered']).nullish().transform(v => v ?? undefined),
  songId: z.string().uuid().nullish().transform(v => v ?? undefined),
  lineId: z.string().uuid().nullish().transform(v => v ?? undefined),
  page: z.coerce.number().min(1).default(1).catch(1),
  limit: z.coerce.number().min(1).max(100).default(100).catch(100),
});

/**
 * GET /api/cards
 * 获取词卡列表（包含歌曲信息）
 */
export async function GET(request: NextRequest) {
  try {
    // 从认证中获取 userId（用于返回用户特定的进度）
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id;

    // 解析查询参数
    const searchParams = request.nextUrl.searchParams;
    const params = querySchema.safeParse({
      status: searchParams.get('status'),
      songId: searchParams.get('songId'),
      lineId: searchParams.get('lineId'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });

    if (!params.success) {
      return NextResponse.json(
        { error: '参数无效', details: params.error.format() },
        { status: 400 }
      );
    }

    const { page, limit, songId, lineId, status } = params.data;
    const offset = (page - 1) * limit;

    // 构建条件
    const conditions = [];
    if (lineId) {
      conditions.push(eq(cards.lineId, lineId));
    }
    if (songId) {
      conditions.push(eq(lines.songId, songId));
    }
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    // 获取词卡列表（包含歌曲信息）
    const data = await db
      .select({
        id: cards.id,
        lineId: cards.lineId,
        word: cards.word,
        reading: cards.reading,
        meaning: cards.meaning,
        partOfSpeech: cards.partOfSpeech,
        exampleSentence: cards.exampleSentence,
        exampleTranslation: cards.exampleTranslation,
        wordPosition: cards.wordPosition,
        createdAt: cards.createdAt,
        // 歌词信息
        lineNumber: lines.lineNumber,
        contentJa: lines.contentJa,
        contentZh: lines.contentZh,
        furigana: lines.furigana,
        // 歌曲信息
        songId: songs.id,
        songTitle: songs.title,
        songArtist: songs.artist,
      })
      .from(cards)
      .innerJoin(lines, eq(cards.lineId, lines.id))
      .innerJoin(songs, eq(lines.songId, songs.id))
      .where(whereCondition)
      .orderBy(desc(cards.createdAt))
      .limit(limit)
      .offset(offset);

    // 获取总数
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(cards)
      .innerJoin(lines, eq(cards.lineId, lines.id))
      .where(whereCondition);

    // 如果有用户 ID，获取进度
    let progressMap: Record<string, { status: string; reviewCount: number }> = {};
    if (userId && data.length > 0) {
      const cardIds = data.map((d) => d.id);
      const progressData = await db
        .select({
          cardId: cardProgress.cardId,
          status: cardProgress.status,
          reviewCount: cardProgress.reviewCount,
        })
        .from(cardProgress)
        .where(
          and(eq(cardProgress.userId, userId), inArray(cardProgress.cardId, cardIds))
        );
      progressMap = Object.fromEntries(
        progressData.map((p) => [p.cardId, { status: p.status, reviewCount: p.reviewCount }])
      );
    }

    // 按歌曲分组
    const cardsBySong = data.reduce(
      (acc, card) => {
        const songKey = card.songId;
        if (!acc[songKey]) {
          acc[songKey] = {
            songId: card.songId,
            songTitle: card.songTitle,
            songArtist: card.songArtist,
            cards: [],
          };
        }
        acc[songKey].cards.push({
          ...card,
          progress: progressMap[card.id],
        });
        return acc;
      },
      {} as Record<string, {
        songId: string;
        songTitle: string;
        songArtist: string | null;
        cards: (typeof data[number] & { progress?: { status: string; reviewCount: number } })[];
      }>
    );

    // 计算统计
    const stats = {
      total: data.length,
      new: data.filter(d => !progressMap[d.id] || progressMap[d.id].status === 'new').length,
      learning: data.filter(d => progressMap[d.id]?.status === 'learning').length,
      mastered: data.filter(d => progressMap[d.id]?.status === 'mastered').length,
    };

    return NextResponse.json({
      data: Object.values(cardsBySong),
      stats,
      pagination: {
        page,
        limit,
        total: countResult[0]?.count ?? 0,
        totalPages: Math.ceil((countResult[0]?.count ?? 0) / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/cards 错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * POST /api/cards
 * 创建新词卡
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();
    const validatedData = createCardSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: '输入无效', details: validatedData.error.format() },
        { status: 400 }
      );
    }

    const input: CreateCardInput = validatedData.data;
    const card = await createCard(input);

    return NextResponse.json({ data: card }, { status: 201 });
  } catch (error) {
    console.error('POST /api/cards 错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
