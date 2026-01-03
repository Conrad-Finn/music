/**
 * 词卡生成 API
 *
 * POST /api/cards/generate
 * 使用 AI 从歌词行自动生成词卡
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { getLineById } from '@/services/songs.service';
import { createCard } from '@/services/cards.service';
import { generateCardsFromLine, isMockMode } from '@/lib/ai';

// 请求验证 Schema
const generateCardsSchema = z.object({
  lineId: z.string().uuid('无效的歌词行 ID'),
  // 可选：指定要生成的词卡数量
  count: z.number().min(1).max(5).optional().default(1),
});

/**
 * POST /api/cards/generate
 * 从歌词行生成词卡
 */
export async function POST(request: NextRequest) {
  try {
    // 获取当前会话
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    // 允许未登录用户使用（但不保存进度）
    const userId = session?.user?.id;

    // 解析请求体
    const body = await request.json();
    const validation = generateCardsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: '参数无效', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { lineId, count } = validation.data;

    // 获取歌词行
    const line = await getLineById(lineId);
    if (!line) {
      return NextResponse.json(
        { error: '歌词行不存在' },
        { status: 404 }
      );
    }

    // 调用 AI 生成词卡
    const generatedCards = await generateCardsFromLine({
      id: line.id,
      contentJa: line.contentJa,
      contentZh: line.contentZh || '',
      furigana: line.furigana || '',
      startTime: line.startTime || 0,
      endTime: line.endTime || 0,
    });

    // 限制返回数量
    const cardsToCreate = generatedCards.slice(0, count);

    // 保存生成的词卡到数据库
    const savedCards = await Promise.all(
      cardsToCreate.map((card) =>
        createCard({
          lineId,
          word: card.word,
          reading: card.reading,
          meaning: card.meaning,
          partOfSpeech: card.partOfSpeech,
          exampleSentence: line.contentJa,
          exampleTranslation: line.contentZh || undefined,
          wordPosition: card.wordPosition,
        })
      )
    );

    return NextResponse.json({
      data: savedCards,
      meta: {
        generated: cardsToCreate.length,
        saved: savedCards.length,
        mockMode: isMockMode(),
        userId: userId || null,
      },
    });
  } catch (error) {
    console.error('POST /api/cards/generate 错误:', error);

    // 区分不同错误类型
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'AI 服务配置错误，请联系管理员' },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: '词卡生成失败，请稍后重试' },
      { status: 500 }
    );
  }
}
