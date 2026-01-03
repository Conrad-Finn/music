/**
 * 歌曲 API 路由
 *
 * GET /api/songs - 获取歌曲列表
 * POST /api/songs - 创建新歌曲
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  createSong,
  getSongs,
  createLines,
  type CreateSongInput,
} from '@/services/songs.service';

// 请求验证 Schema
const createSongSchema = z.object({
  title: z.string().min(1).max(200),
  artist: z.string().max(100).optional(),
  duration: z.number().optional(),
  coverUrl: z.string().url().optional(),
  source: z.enum(['local', 'platform']).optional(),
  sourceRef: z.string().max(255).optional(),
  isPublic: z.boolean().optional(),
  lines: z
    .array(
      z.object({
        lineNumber: z.number(),
        contentJa: z.string(),
        contentZh: z.string().optional(),
        furigana: z
          .array(
            z.object({
              word: z.string(),
              reading: z.string(),
              start: z.number(),
              end: z.number(),
            })
          )
          .optional(),
        startTime: z.number().optional(),
        endTime: z.number().optional(),
      })
    )
    .optional(),
});

const querySchema = z.object({
  search: z.string().nullish().transform(v => v ?? undefined),
  page: z.coerce.number().min(1).default(1).catch(1),
  limit: z.coerce.number().min(1).max(100).default(10).catch(10),
});

/**
 * GET /api/songs
 * 获取歌曲列表
 */
export async function GET(request: NextRequest) {
  try {
    // 从认证中获取 userId（用于显示私有歌曲）
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id;

    // 解析查询参数
    const searchParams = request.nextUrl.searchParams;
    const params = querySchema.safeParse({
      search: searchParams.get('search'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });

    if (!params.success) {
      return NextResponse.json(
        { error: '参数无效', details: params.error.format() },
        { status: 400 }
      );
    }

    const { page, limit, search } = params.data;
    const offset = (page - 1) * limit;

    const result = await getSongs({
      search,
      creatorId: userId,
      includePublic: true,
      limit,
      offset,
    });

    return NextResponse.json({
      data: result.data,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/songs 错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * POST /api/songs
 * 创建新歌曲（含歌词）
 */
export async function POST(request: NextRequest) {
  try {
    // 从认证中获取 userId
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    // 创建歌曲需要登录
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 解析请求体
    const body = await request.json();
    const validatedData = createSongSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: '输入无效', details: validatedData.error.format() },
        { status: 400 }
      );
    }

    const { lines: linesData, ...songData } = validatedData.data;

    // 创建歌曲
    const input: CreateSongInput = {
      ...songData,
      creatorId: userId,
    };

    const song = await createSong(input);

    // 如果有歌词数据，创建歌词行
    if (linesData && linesData.length > 0) {
      await createLines(
        linesData.map((line) => ({
          ...line,
          songId: song.id,
        }))
      );
    }

    return NextResponse.json({ data: song }, { status: 201 });
  } catch (error) {
    console.error('POST /api/songs 错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
