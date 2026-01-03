/**
 * 对话列表页面
 *
 * 展示用户的所有 AI 对话记录
 * 支持分页和搜索
 */

import { db } from '@/db';
import { conversations } from '@/db/schema';
import { desc, ilike, or, sql } from 'drizzle-orm';
import { MessageSquare, Search, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Header } from '@/components/layout/Header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string }>;
}

export default async function ConversationsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const limit = 10;
  const q = params.q || undefined;
  const offset = (page - 1) * limit;

  // 构建查询条件
  const whereCondition = q
    ? or(
        ilike(conversations.title, `%${q}%`),
        ilike(conversations.summary, `%${q}%`)
      )
    : undefined;

  // 查询数据
  const [data, countResult] = await Promise.all([
    db
      .select()
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

  // 格式化日期
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  // 获取目的标签
  const getPurposeBadge = (purpose?: string) => {
    switch (purpose) {
      case 'lyrics_parse':
        return <Badge variant="secondary">歌词解析</Badge>;
      case 'card_generate':
        return <Badge variant="outline">词卡生成</Badge>;
      case 'chat':
        return <Badge>问答</Badge>;
      default:
        return null;
    }
  };

  return (
    <AppShell>
      <Header title="对话记录" showHome />

      <div className="p-4">
        {/* 搜索框 */}
        <form className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            name="q"
            placeholder="搜索对话..."
            defaultValue={q}
            className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </form>

        {/* 统计信息 */}
        <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
          <MessageSquare className="h-4 w-4" />
          <span>共 {total} 个对话</span>
          {q && <span>（搜索: {q}）</span>}
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-56px-180px)]">
        <div className="px-4 space-y-2">
          {data.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{q ? '没有找到匹配的对话' : '还没有对话记录'}</p>
            </div>
          ) : (
            data.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/conversations/${conversation.id}`}
                className="block p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{conversation.title}</h3>
                      {getPurposeBadge(conversation.metadata?.purpose)}
                    </div>
                    {conversation.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {conversation.summary}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{formatDate(conversation.createdAt)}</span>
                      {conversation.metadata?.totalTokens && (
                        <span>{conversation.metadata.totalTokens} tokens</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </div>
              </Link>
            ))
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4">
              {page > 1 && (
                <Link
                  href={`/conversations?page=${page - 1}${q ? `&q=${q}` : ''}`}
                  className="px-3 py-1 rounded border hover:bg-accent"
                >
                  上一页
                </Link>
              )}
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/conversations?page=${page + 1}${q ? `&q=${q}` : ''}`}
                  className="px-3 py-1 rounded border hover:bg-accent"
                >
                  下一页
                </Link>
              )}
            </div>
          )}

          {/* 底部留白 */}
          <div className="h-4" />
        </div>
      </ScrollArea>
    </AppShell>
  );
}
