/**
 * 单个歌曲 API 路由
 *
 * GET /api/songs/[id] - 获取歌曲详情（含歌词）
 * PATCH /api/songs/[id] - 更新歌曲
 * DELETE /api/songs/[id] - 删除歌曲
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  getSongWithLines,
  updateSong,
  deleteSong,
  getSongById,
} from '@/services/songs.service';

// 更新请求验证 Schema
const updateSongSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  artist: z.string().max(100).optional(),
  duration: z.number().optional(),
  coverUrl: z.string().url().optional(),
  sourceRef: z.string().max(255).optional(),
  isPublic: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/songs/[id]
 * 获取歌曲详情（含歌词）
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const song = await getSongWithLines(id);

    if (!song) {
      return NextResponse.json({ error: '歌曲未找到' }, { status: 404 });
    }

    // 检查访问权限
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id;

    if (!song.isPublic && song.creatorId !== userId) {
      return NextResponse.json({ error: '未授权' }, { status: 403 });
    }

    return NextResponse.json({ data: song });
  } catch (error) {
    console.error('GET /api/songs/[id] 错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * PATCH /api/songs/[id]
 * 更新歌曲
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 从认证中获取 userId
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const userId = session.user.id;

    // 检查所有权
    const existing = await getSongById(id);
    if (!existing) {
      return NextResponse.json({ error: '歌曲未找到' }, { status: 404 });
    }

    if (existing.creatorId !== userId) {
      return NextResponse.json({ error: '未授权' }, { status: 403 });
    }

    // 解析请求体
    const body = await request.json();
    const validatedData = updateSongSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: '输入无效', details: validatedData.error.format() },
        { status: 400 }
      );
    }

    const song = await updateSong(id, validatedData.data);

    return NextResponse.json({ data: song });
  } catch (error) {
    console.error('PATCH /api/songs/[id] 错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * DELETE /api/songs/[id]
 * 删除歌曲
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 从认证中获取 userId
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const userId = session.user.id;

    // 检查所有权
    const existing = await getSongById(id);
    if (!existing) {
      return NextResponse.json({ error: '歌曲未找到' }, { status: 404 });
    }

    if (existing.creatorId !== userId) {
      return NextResponse.json({ error: '未授权' }, { status: 403 });
    }

    const deleted = await deleteSong(id);

    if (!deleted) {
      return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/songs/[id] 错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
