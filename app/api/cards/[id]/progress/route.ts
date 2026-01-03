/**
 * 词卡学习进度 API 路由
 *
 * POST/PATCH /api/cards/[id]/progress - 更新学习进度
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { updateCardStatus, getOrCreateProgress } from '@/services/cards.service';

// 请求验证 Schema
const updateProgressSchema = z.object({
  status: z.enum(['new', 'learning', 'mastered']),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 更新学习进度的通用处理函数
 */
async function handleUpdateProgress(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: cardId } = await params;

    // 从认证中获取 userId（学习进度需要登录）
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const userId = session.user.id;

    // 解析请求体
    const body = await request.json();
    const validatedData = updateProgressSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: '输入无效', details: validatedData.error.format() },
        { status: 400 }
      );
    }

    const progress = await updateCardStatus(userId, cardId, validatedData.data.status);

    return NextResponse.json({ data: progress });
  } catch (error) {
    console.error('UPDATE /api/cards/[id]/progress 错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * POST /api/cards/[id]/progress
 * 更新词卡学习进度
 */
export async function POST(request: NextRequest, context: RouteParams) {
  return handleUpdateProgress(request, context);
}

/**
 * PATCH /api/cards/[id]/progress
 * 更新词卡学习进度（兼容 PATCH 请求）
 */
export async function PATCH(request: NextRequest, context: RouteParams) {
  return handleUpdateProgress(request, context);
}

/**
 * GET /api/cards/[id]/progress
 * 获取词卡学习进度
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: cardId } = await params;

    // 从认证中获取 userId（学习进度需要登录）
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const userId = session.user.id;

    const progress = await getOrCreateProgress(userId, cardId);

    return NextResponse.json({ data: progress });
  } catch (error) {
    console.error('GET /api/cards/[id]/progress 错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
