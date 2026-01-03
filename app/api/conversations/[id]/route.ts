/**
 * 单个对话 API 路由
 *
 * GET /api/conversations/[id] - 获取对话详情
 * PATCH /api/conversations/[id] - 更新对话
 * DELETE /api/conversations/[id] - 删除对话
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  getConversationWithMessages,
  updateConversation,
  deleteConversation,
  verifyConversationOwnership,
} from '@/services/conversations.service';

// 更新请求验证 Schema
const updateConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  summary: z.string().max(500).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/conversations/[id]
 * 获取对话详情
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // 验证所有权
    const isOwner = await verifyConversationOwnership(id, userId);
    if (!isOwner) {
      return NextResponse.json({ error: '未授权' }, { status: 403 });
    }

    const conversation = await getConversationWithMessages(id);

    if (!conversation) {
      return NextResponse.json({ error: '对话未找到' }, { status: 404 });
    }

    return NextResponse.json({ data: conversation });
  } catch (error) {
    console.error('GET /api/conversations/[id] 错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * PATCH /api/conversations/[id]
 * 更新对话
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

    // 验证所有权
    const isOwner = await verifyConversationOwnership(id, userId);
    if (!isOwner) {
      return NextResponse.json({ error: '未授权' }, { status: 403 });
    }

    // 解析请求体
    const body = await request.json();
    const validatedData = updateConversationSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: '输入无效', details: validatedData.error.format() },
        { status: 400 }
      );
    }

    const conversation = await updateConversation(id, validatedData.data);

    if (!conversation) {
      return NextResponse.json({ error: '对话未找到' }, { status: 404 });
    }

    return NextResponse.json({ data: conversation });
  } catch (error) {
    console.error('PATCH /api/conversations/[id] 错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * DELETE /api/conversations/[id]
 * 删除对话
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

    // 验证所有权
    const isOwner = await verifyConversationOwnership(id, userId);
    if (!isOwner) {
      return NextResponse.json({ error: '未授权' }, { status: 403 });
    }

    const deleted = await deleteConversation(id);

    if (!deleted) {
      return NextResponse.json({ error: '对话未找到' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/conversations/[id] 错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
