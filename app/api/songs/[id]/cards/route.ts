/**
 * 歌曲词卡 API 路由
 *
 * GET /api/songs/[id]/cards - 获取歌曲的所有词卡
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { cards, lines } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/songs/[id]/cards
 * 获取歌曲的所有词卡
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: songId } = await params;

    // 获取该歌曲所有歌词行的词卡
    const songCards = await db
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
      })
      .from(cards)
      .innerJoin(lines, eq(cards.lineId, lines.id))
      .where(eq(lines.songId, songId))
      .orderBy(lines.lineNumber);

    return NextResponse.json({
      data: songCards,
      meta: {
        total: songCards.length,
        songId,
      },
    });
  } catch (error) {
    console.error('GET /api/songs/[id]/cards 错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
