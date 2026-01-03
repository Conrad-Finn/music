/**
 * GET /api/v1/conversations
 *
 * 第三方 API：获取对话列表
 * 支持分页和搜索
 *
 * Query Parameters:
 * - page: 页码（默认 1）
 * - limit: 每页数量（默认 10，最大 100）
 * - q: 搜索关键词（搜索标题和摘要）
 *
 * Response:
 * {
 *   data: Conversation[],
 *   pagination: {
 *     page: number,
 *     limit: number,
 *     total: number,
 *     totalPages: number
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { conversations } from '@/db/schema';
import { desc, ilike, or, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // 解析查询参数
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const q = searchParams.get('q') || undefined;

    const offset = (page - 1) * limit;

    // 构建查询条件
    const whereCondition = q
      ? or(
          ilike(conversations.title, `%${q}%`),
          ilike(conversations.summary, `%${q}%`)
        )
      : undefined;

    // 并行查询数据和总数
    const [data, countResult] = await Promise.all([
      db
        .select({
          id: conversations.id,
          title: conversations.title,
          summary: conversations.summary,
          songId: conversations.songId,
          metadata: conversations.metadata,
          createdAt: conversations.createdAt,
          updatedAt: conversations.updatedAt,
        })
        .from(conversations)
        .where(whereCondition)
        .orderBy(desc(conversations.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(conversations)
        .where(whereCondition),
    ]);

    const total = countResult[0]?.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
