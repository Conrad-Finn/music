/**
 * GET /api/v1/conversations/:id
 *
 * 第三方 API：获取单个对话详情
 * 可选包含消息列表
 *
 * Query Parameters:
 * - include: 可选值 "messages"，包含对话中的消息
 *
 * Response:
 * {
 *   data: {
 *     id: string,
 *     title: string,
 *     summary: string | null,
 *     songId: string | null,
 *     metadata: object | null,
 *     createdAt: Date,
 *     updatedAt: Date,
 *     messages?: Message[]  // 当 include=messages 时包含
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { conversations, messages } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const include = searchParams.get('include');
    const includeMessages = include === 'messages';

    // 查询对话
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, id),
      with: includeMessages
        ? {
            messages: {
              orderBy: (messages, { asc }) => [asc(messages.createdAt)],
            },
          }
        : undefined,
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // 构建响应数据
    const responseData: Record<string, unknown> = {
      id: conversation.id,
      title: conversation.title,
      summary: conversation.summary,
      songId: conversation.songId,
      metadata: conversation.metadata,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };

    // 如果包含消息，添加到响应
    if (includeMessages && 'messages' in conversation) {
      responseData.messages = (conversation.messages as Array<{
        id: string;
        role: string;
        content: string;
        tokens: number | null;
        createdAt: Date;
      }>).map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        tokens: msg.tokens,
        createdAt: msg.createdAt,
      }));
    }

    return NextResponse.json({ data: responseData });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
