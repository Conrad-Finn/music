/**
 * 词卡 Hooks
 *
 * 提供词卡相关的客户端操作
 */

import { useState, useCallback } from 'react';
import type { Card, CardProgress, Line } from '@/db/schema';

// ============================================================================
// 类型定义
// ============================================================================

export type CardStatus = 'new' | 'learning' | 'mastered';

export interface CardWithProgress extends Card {
  progress?: CardProgress;
  line?: Line;
}

export interface CardStats {
  total: number;
  new: number;
  learning: number;
  mastered: number;
}

export interface CreateCardInput {
  lineId: string;
  word: string;
  reading?: string;
  meaning: string;
  partOfSpeech?: 'noun' | 'verb' | 'adjective' | 'adverb' | 'particle' | 'other';
  exampleSentence?: string;
  exampleTranslation?: string;
}

export interface UseCardsResult {
  cards: CardWithProgress[];
  stats: CardStats;
  total: number;
  isLoading: boolean;
  error: string | null;
  fetchCards: (options?: {
    status?: CardStatus;
    songId?: string;
    page?: number;
  }) => Promise<void>;
  createCard: (input: CreateCardInput) => Promise<Card | null>;
  updateStatus: (cardId: string, status: CardStatus) => Promise<boolean>;
  deleteCard: (id: string) => Promise<boolean>;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * 词卡列表 Hook
 */
export function useCards(): UseCardsResult {
  const [cards, setCards] = useState<CardWithProgress[]>([]);
  const [stats, setStats] = useState<CardStats>({
    total: 0,
    new: 0,
    learning: 0,
    mastered: 0,
  });
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCards = useCallback(
    async (options?: { status?: CardStatus; songId?: string; page?: number }) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (options?.status) params.set('status', options.status);
        if (options?.songId) params.set('songId', options.songId);
        if (options?.page) params.set('page', options.page.toString());

        const response = await fetch(`/api/cards?${params}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '获取词卡失败');
        }

        setCards(data.data);
        setStats(data.stats);
        setTotal(data.pagination.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取词卡失败');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const createCard = useCallback(
    async (input: CreateCardInput): Promise<Card | null> => {
      setError(null);

      try {
        const response = await fetch('/api/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '创建词卡失败');
        }

        // 刷新列表
        await fetchCards();

        return data.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : '创建词卡失败');
        return null;
      }
    },
    [fetchCards]
  );

  const updateStatus = useCallback(
    async (cardId: string, status: CardStatus): Promise<boolean> => {
      setError(null);

      try {
        const response = await fetch(`/api/cards/${cardId}/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '更新状态失败');
        }

        // 更新本地状态
        setCards((prev) =>
          prev.map((card) =>
            card.id === cardId ? { ...card, progress: data.data } : card
          )
        );

        // 更新统计
        setStats((prev) => {
          const newStats = { ...prev };
          // 简化处理：重新获取统计
          return newStats;
        });

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : '更新状态失败');
        return false;
      }
    },
    []
  );

  const deleteCard = useCallback(async (id: string): Promise<boolean> => {
    setError(null);

    try {
      const response = await fetch(`/api/cards/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '删除词卡失败');
      }

      // 更新本地状态
      setCards((prev) => prev.filter((c) => c.id !== id));
      setTotal((prev) => prev - 1);

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除词卡失败');
      return false;
    }
  }, []);

  return {
    cards,
    stats,
    total,
    isLoading,
    error,
    fetchCards,
    createCard,
    updateStatus,
    deleteCard,
  };
}

/**
 * 单个词卡 Hook
 */
export function useCard(id?: string) {
  const [card, setCard] = useState<CardWithProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCard = useCallback(async (cardId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/cards/${cardId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '获取词卡失败');
      }

      setCard(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取词卡失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateStatus = useCallback(
    async (status: CardStatus): Promise<boolean> => {
      if (!card) {
        setError('词卡未加载');
        return false;
      }

      setError(null);

      try {
        const response = await fetch(`/api/cards/${card.id}/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '更新状态失败');
        }

        setCard((prev) => (prev ? { ...prev, progress: data.data } : null));

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : '更新状态失败');
        return false;
      }
    },
    [card]
  );

  return {
    card,
    isLoading,
    error,
    fetchCard,
    updateStatus,
  };
}
