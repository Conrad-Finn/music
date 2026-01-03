/**
 * 对话 API 路由
 *
 * GET /api/conversations - 获取对话列表
 * POST /api/conversations - 创建新对话
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createConversation,
  getConversations,
  type CreateConversationInput,
} from '@/services/conversations.service';

// 请求验证 Schema
const createConversationSchema = z.object({
  title: z.string().min(1).max(200),
  songId: z.string().uuid().optional(),
  purpose: z.enum(['lyrics_parse', 'card_generate', 'chat']).optional(),
  model: z.string().optional(),
});

const querySchema = z.object({
  search: z.string().nullish().transform(v => v ?? undefined),
  purpose: z.enum(['lyrics_parse', 'card_generate', 'chat']).nullish().transform(v => v ?? undefined),
  songId: z.string().uuid().nullish().transform(v => v ?? undefined),
  page: z.coerce.number().min(1).default(1).catch(1),
  limit: z.coerce.number().min(1).max(100).default(10).catch(10),
});

/**
 * GET /api/conversations
 * 获取对话列表
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: 从认证中获取 userId
    // 目前返回空列表（无认证时无法查看对话）
    return NextResponse.json({
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });
  } catch (error) {
    console.error('GET /api/conversations 错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * POST /api/conversations
 * 创建新对话
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: 从认证中获取 userId
    // 目前返回错误（需要认证才能创建对话）
    return NextResponse.json({ error: '需要登录才能创建对话' }, { status: 401 });
  } catch (error) {
    console.error('POST /api/conversations 错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
