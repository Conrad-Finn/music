/**
 * 歌词解析 API
 *
 * POST /api/songs/parse-lyrics
 * 使用 AI 解析原始歌词，添加假名注音和中文翻译
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { parseLyrics, parseSingleLine, isMockMode } from '@/lib/ai';

// 批量解析请求 Schema
const batchParseSchema = z.object({
  lyrics: z.array(z.string().min(1)).min(1).max(100),
});

// 单行解析请求 Schema
const singleParseSchema = z.object({
  contentJa: z.string().min(1),
});

/**
 * POST /api/songs/parse-lyrics
 * 解析歌词（支持批量和单行模式）
 */
export async function POST(request: NextRequest) {
  try {
    // 获取当前会话（可选，用于限流等）
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const userId = session?.user?.id;

    // 解析请求体
    const body = await request.json();

    // 判断是批量解析还是单行解析
    const isBatch = 'lyrics' in body && Array.isArray(body.lyrics);

    if (isBatch) {
      // 批量解析模式
      const validation = batchParseSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: '参数无效', details: validation.error.format() },
          { status: 400 }
        );
      }

      const { lyrics } = validation.data;

      // 调用 AI 解析歌词
      const parsedLines = await parseLyrics(lyrics);

      return NextResponse.json({
        data: parsedLines,
        meta: {
          total: parsedLines.length,
          mockMode: isMockMode(),
          userId: userId || null,
        },
      });
    } else {
      // 单行解析模式
      const validation = singleParseSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: '参数无效', details: validation.error.format() },
          { status: 400 }
        );
      }

      const { contentJa } = validation.data;

      // 调用 AI 解析单行歌词
      const result = await parseSingleLine(contentJa);

      return NextResponse.json({
        data: {
          contentJa,
          contentZh: result.contentZh,
          furigana: result.furigana,
          tokens: result.tokens,
        },
        meta: {
          mockMode: isMockMode(),
          userId: userId || null,
        },
      });
    }
  } catch (error) {
    console.error('POST /api/songs/parse-lyrics 错误:', error);

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
      { error: '歌词解析失败，请稍后重试' },
      { status: 500 }
    );
  }
}
