/**
 * 歌词行批量更新 API
 *
 * PATCH /api/songs/[id]/lines
 * 批量更新歌词行（用于 AI 解析后更新注音和翻译）
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getSongById, getLinesBySongId, updateLine } from '@/services/songs.service';

// 请求验证 Schema
const updateLinesSchema = z.object({
  lines: z.array(
    z.object({
      id: z.string().uuid().optional(),
      lineNumber: z.number(),
      contentJa: z.string().optional(),
      contentZh: z.string().optional(),
      furigana: z.string().optional(), // JSON 字符串
      tokens: z.string().optional(), // JSON 字符串
      startTime: z.number().optional(),
      endTime: z.number().optional(),
    })
  ),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/songs/[id]/lines
 * 批量更新歌词行
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: songId } = await params;

    // 从认证中获取 userId
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const userId = session.user.id;

    // 检查歌曲所有权
    const song = await getSongById(songId);
    if (!song) {
      return NextResponse.json({ error: '歌曲未找到' }, { status: 404 });
    }

    if (song.creatorId !== userId) {
      return NextResponse.json({ error: '未授权' }, { status: 403 });
    }

    // 解析请求体
    const body = await request.json();
    const validation = updateLinesSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: '参数无效', details: validation.error.format() },
        { status: 400 }
      );
    }

    // 获取现有歌词行
    const existingLines = await getLinesBySongId(songId);
    const lineMap = new Map(existingLines.map((l) => [l.lineNumber, l]));

    // 更新歌词行
    const updatedLines = await Promise.all(
      validation.data.lines.map(async (lineData) => {
        const existingLine = lineData.id
          ? existingLines.find((l) => l.id === lineData.id)
          : lineMap.get(lineData.lineNumber);

        if (existingLine) {
          return updateLine(existingLine.id, {
            contentZh: lineData.contentZh,
            furigana: lineData.furigana,
            tokens: lineData.tokens,
            startTime: lineData.startTime,
            endTime: lineData.endTime,
          });
        }
        return null;
      })
    );

    return NextResponse.json({
      data: updatedLines.filter(Boolean),
      meta: {
        updated: updatedLines.filter(Boolean).length,
        total: validation.data.lines.length,
      },
    });
  } catch (error) {
    console.error('PATCH /api/songs/[id]/lines 错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * GET /api/songs/[id]/lines
 * 获取歌曲的所有歌词行
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: songId } = await params;

    const lines = await getLinesBySongId(songId);

    return NextResponse.json({ data: lines });
  } catch (error) {
    console.error('GET /api/songs/[id]/lines 错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
