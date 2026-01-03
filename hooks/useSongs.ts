/**
 * 歌曲 Hooks
 *
 * 提供歌曲相关的客户端操作
 */

import { useState, useCallback } from 'react';
import type { Song, Line } from '@/db/schema';

// ============================================================================
// 类型定义
// ============================================================================

export interface SongWithLines extends Song {
  lines: Line[];
}

export interface CreateSongInput {
  title: string;
  artist?: string;
  duration?: number;
  coverUrl?: string;
  source?: 'local' | 'platform';
  sourceRef?: string;
  isPublic?: boolean;
  lines?: Array<{
    lineNumber: number;
    contentJa: string;
    contentZh?: string;
    startTime?: number;
    endTime?: number;
  }>;
}

export interface UseSongsResult {
  songs: Song[];
  total: number;
  isLoading: boolean;
  error: string | null;
  fetchSongs: (options?: { search?: string; page?: number }) => Promise<void>;
  createSong: (input: CreateSongInput) => Promise<Song | null>;
  deleteSong: (id: string) => Promise<boolean>;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * 歌曲列表 Hook
 */
export function useSongs(): UseSongsResult {
  const [songs, setSongs] = useState<Song[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSongs = useCallback(
    async (options?: { search?: string; page?: number }) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (options?.search) params.set('search', options.search);
        if (options?.page) params.set('page', options.page.toString());

        const response = await fetch(`/api/songs?${params}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '获取歌曲失败');
        }

        setSongs(data.data);
        setTotal(data.pagination.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取歌曲失败');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const createSong = useCallback(
    async (input: CreateSongInput): Promise<Song | null> => {
      setError(null);

      try {
        const response = await fetch('/api/songs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '创建歌曲失败');
        }

        await fetchSongs();
        return data.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : '创建歌曲失败');
        return null;
      }
    },
    [fetchSongs]
  );

  const deleteSong = useCallback(async (id: string): Promise<boolean> => {
    setError(null);

    try {
      const response = await fetch(`/api/songs/${id}`, { method: 'DELETE' });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '删除歌曲失败');
      }

      setSongs((prev) => prev.filter((s) => s.id !== id));
      setTotal((prev) => prev - 1);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除歌曲失败');
      return false;
    }
  }, []);

  return { songs, total, isLoading, error, fetchSongs, createSong, deleteSong };
}

/**
 * 单个歌曲 Hook
 */
export function useSong() {
  const [song, setSong] = useState<SongWithLines | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSong = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/songs/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '获取歌曲失败');
      }

      setSong(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取歌曲失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { song, isLoading, error, fetchSong };
}
