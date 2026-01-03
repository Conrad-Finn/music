/**
 * 对话消息 API 路由
 *
 * GET /api/conversations/[id]/messages - 获取消息列表
 * POST /api/conversations/[id]/messages - 发送新消息
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  getMessagesByConversationId,
  createMessage,
  verifyConversationOwnership,
} from '@/services/conversations.service';

// 请求验证 Schema
const createMessageSchema = z.object({
  content: z.string().min(1).max(10000),
  role: z.enum(['user', 'assistant', 'system']).default('user'),
  tokens: z.number().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/conversations/[id]/messages
 * 获取对话的所有消息
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

    const messages = await getMessagesByConversationId(id);

    return NextResponse.json({ data: messages });
  } catch (error) {
    console.error('GET /api/conversations/[id]/messages 错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * POST /api/conversations/[id]/messages
 * 发送新消息
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: conversationId } = await params;

    // 从认证中获取 userId
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const userId = session.user.id;

    // 验证所有权
    const isOwner = await verifyConversationOwnership(conversationId, userId);
    if (!isOwner) {
      return NextResponse.json({ error: '未授权' }, { status: 403 });
    }

    // 解析请求体
    const body = await request.json();
    const validatedData = createMessageSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: '输入无效', details: validatedData.error.format() },
        { status: 400 }
      );
    }

    const message = await createMessage({
      conversationId,
      role: validatedData.data.role,
      content: validatedData.data.content,
      tokens: validatedData.data.tokens,
    });

    return NextResponse.json({ data: message }, { status: 201 });
  } catch (error) {
    console.error('POST /api/conversations/[id]/messages 错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
