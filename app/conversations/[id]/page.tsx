/**
 * 对话详情页面
 *
 * 展示单个对话的所有消息
 */

import { db } from '@/db';
import { conversations, messages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ArrowLeft, Bot, User, Clock } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConversationDetailPage({ params }: PageProps) {
  const { id } = await params;

  // 查询对话和消息
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
    with: {
      messages: {
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
      },
    },
  });

  if (!conversation) {
    notFound();
  }

  // 格式化日期时间
  const formatDateTime = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 获取角色图标和样式
  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'user':
        return {
          icon: <User className="h-5 w-5" />,
          label: '你',
          bgClass: 'bg-primary text-primary-foreground',
          alignClass: 'justify-end',
          bubbleClass: 'bg-primary text-primary-foreground',
        };
      case 'assistant':
        return {
          icon: <Bot className="h-5 w-5" />,
          label: 'AI',
          bgClass: 'bg-muted',
          alignClass: 'justify-start',
          bubbleClass: 'bg-muted',
        };
      default:
        return {
          icon: <Bot className="h-5 w-5" />,
          label: '系统',
          bgClass: 'bg-secondary',
          alignClass: 'justify-center',
          bubbleClass: 'bg-secondary text-secondary-foreground text-center',
        };
    }
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
      {/* 自定义 Header */}
      <header className="sticky top-0 z-50 flex items-center gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link
          href="/conversations"
          className="p-2 -ml-2 rounded-full hover:bg-accent"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold truncate">{conversation.title}</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatDateTime(conversation.createdAt)}</span>
            {getPurposeBadge(conversation.metadata?.purpose)}
          </div>
        </div>
      </header>

      {/* 对话摘要 */}
      {conversation.summary && (
        <div className="px-4 py-3 border-b bg-muted/50">
          <p className="text-sm text-muted-foreground">{conversation.summary}</p>
        </div>
      )}

      <ScrollArea className="h-[calc(100vh-120px)]">
        <div className="p-4 space-y-4">
          {conversation.messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无消息</p>
            </div>
          ) : (
            conversation.messages.map((message) => {
              const roleInfo = getRoleInfo(message.role);
              return (
                <div
                  key={message.id}
                  className={`flex ${roleInfo.alignClass}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${roleInfo.bubbleClass}`}
                  >
                    {message.role !== 'user' && (
                      <div className="flex items-center gap-2 mb-1 text-xs opacity-70">
                        {roleInfo.icon}
                        <span>{roleInfo.label}</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap break-words">
                      {message.content}
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-2 text-xs opacity-50">
                      {message.tokens && <span>{message.tokens} tokens</span>}
                      <span>{formatDateTime(message.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* 元数据信息 */}
          {conversation.metadata && (
            <div className="text-center py-4 text-xs text-muted-foreground">
              {conversation.metadata.model && (
                <span>模型: {conversation.metadata.model}</span>
              )}
              {conversation.metadata.totalTokens && (
                <span className="ml-3">
                  总计: {conversation.metadata.totalTokens} tokens
                </span>
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
