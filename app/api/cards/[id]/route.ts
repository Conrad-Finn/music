/**
 * 单个词卡 API 路由
 *
 * GET /api/cards/[id] - 获取词卡详情
 * PATCH /api/cards/[id] - 更新词卡
 * DELETE /api/cards/[id] - 删除词卡
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  getCardWithProgress,
  getCardById,
  updateCard,
  deleteCard,
} from '@/services/cards.service';

// 更新请求验证 Schema
const updateCardSchema = z.object({
  word: z.string().min(1).max(100).optional(),
  reading: z.string().max(100).optional(),
  meaning: z.string().optional(),
  partOfSpeech: z
    .enum(['noun', 'verb', 'adjective', 'adverb', 'particle', 'other'])
    .optional(),
  exampleSentence: z.string().optional(),
  exampleTranslation: z.string().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/cards/[id]
 * 获取词卡详情
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 从认证中获取 userId（用于返回用户特定的进度）
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id;

    // 如果有用户登录，获取带进度的词卡；否则只获取词卡基本信息
    if (userId) {
      const card = await getCardWithProgress(id, userId);
      if (!card) {
        return NextResponse.json({ error: '词卡未找到' }, { status: 404 });
      }
      return NextResponse.json({ data: card });
    } else {
      const card = await getCardById(id);
      if (!card) {
        return NextResponse.json({ error: '词卡未找到' }, { status: 404 });
      }
      return NextResponse.json({ data: card });
    }
  } catch (error) {
    console.error('GET /api/cards/[id] 错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * PATCH /api/cards/[id]
 * 更新词卡
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 解析请求体
    const body = await request.json();
    const validatedData = updateCardSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: '输入无效', details: validatedData.error.format() },
        { status: 400 }
      );
    }

    const card = await updateCard(id, validatedData.data);

    if (!card) {
      return NextResponse.json({ error: '词卡未找到' }, { status: 404 });
    }

    return NextResponse.json({ data: card });
  } catch (error) {
    console.error('PATCH /api/cards/[id] 错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * DELETE /api/cards/[id]
 * 删除词卡
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const deleted = await deleteCard(id);

    if (!deleted) {
      return NextResponse.json({ error: '词卡未找到' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/cards/[id] 错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
