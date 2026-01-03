/**
 * 对话 Hooks
 *
 * 提供对话相关的客户端操作
 */

import { useState, useCallback } from 'react';
import type { Conversation, Message } from '@/db/schema';

// ============================================================================
// 类型定义
// ============================================================================

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface CreateConversationInput {
  title: string;
  songId?: string;
  purpose?: 'lyrics_parse' | 'card_generate' | 'chat';
}

export interface UseConversationsResult {
  conversations: Conversation[];
  total: number;
  isLoading: boolean;
  error: string | null;
  fetchConversations: (options?: { search?: string; page?: number }) => Promise<void>;
  createConversation: (input: CreateConversationInput) => Promise<Conversation | null>;
  deleteConversation: (id: string) => Promise<boolean>;
}

export interface UseConversationResult {
  conversation: ConversationWithMessages | null;
  isLoading: boolean;
  error: string | null;
  fetchConversation: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<Message | null>;
  updateTitle: (title: string) => Promise<boolean>;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * 对话列表 Hook
 */
export function useConversations(): UseConversationsResult {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(
    async (options?: { search?: string; page?: number }) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (options?.search) params.set('search', options.search);
        if (options?.page) params.set('page', options.page.toString());

        const response = await fetch(`/api/conversations?${params}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '获取对话失败');
        }

        setConversations(data.data);
        setTotal(data.pagination.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取对话失败');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const createConversation = useCallback(
    async (input: CreateConversationInput): Promise<Conversation | null> => {
      setError(null);

      try {
        const response = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '创建对话失败');
        }

        // 刷新列表
        await fetchConversations();

        return data.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : '创建对话失败');
        return null;
      }
    },
    [fetchConversations]
  );

  const deleteConversation = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);

      try {
        const response = await fetch(`/api/conversations/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || '删除对话失败');
        }

        // 更新本地状态
        setConversations((prev) => prev.filter((c) => c.id !== id));
        setTotal((prev) => prev - 1);

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : '删除对话失败');
        return false;
      }
    },
    []
  );

  return {
    conversations,
    total,
    isLoading,
    error,
    fetchConversations,
    createConversation,
    deleteConversation,
  };
}

/**
 * 单个对话 Hook
 */
export function useConversation(initialId?: string): UseConversationResult {
  const [conversation, setConversation] =
    useState<ConversationWithMessages | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversation = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/conversations/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '获取对话失败');
      }

      setConversation(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取对话失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string): Promise<Message | null> => {
      if (!conversation) {
        setError('请先选择对话');
        return null;
      }

      setError(null);

      try {
        const response = await fetch(
          `/api/conversations/${conversation.id}/messages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, role: 'user' }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '发送消息失败');
        }

        // 更新本地状态
        setConversation((prev) =>
          prev
            ? {
                ...prev,
                messages: [...prev.messages, data.data],
              }
            : null
        );

        return data.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : '发送消息失败');
        return null;
      }
    },
    [conversation]
  );

  const updateTitle = useCallback(
    async (title: string): Promise<boolean> => {
      if (!conversation) {
        setError('请先选择对话');
        return false;
      }

      setError(null);

      try {
        const response = await fetch(`/api/conversations/${conversation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '更新标题失败');
        }

        // 更新本地状态
        setConversation((prev) =>
          prev ? { ...prev, title: data.data.title } : null
        );

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : '更新标题失败');
        return false;
      }
    },
    [conversation]
  );

  return {
    conversation,
    isLoading,
    error,
    fetchConversation,
    sendMessage,
    updateTitle,
  };
}
