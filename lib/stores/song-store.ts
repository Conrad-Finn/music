'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Song } from '@/types'
import { MOCK_SONGS } from '@/data/mock/songs'

interface SongState {
  songs: Song[]
  recentlyPlayed: string[] // song ids

  // 动作
  toggleFavorite: (id: string) => void
  addToRecent: (id: string) => void

  // 查询
  getSongById: (id: string) => Song | undefined
  getFavorites: () => Song[]
  getRecent: () => Song[]
}

export const useSongStore = create<SongState>()(
  persist(
    (set, get) => ({
      songs: MOCK_SONGS,
      recentlyPlayed: [MOCK_SONGS[0]?.id].filter(Boolean),

      toggleFavorite: (id) => {
        set((s) => ({
          songs: s.songs.map((song) =>
            song.id === id ? { ...song, isFavorite: !song.isFavorite } : song
          ),
        }))
      },

      addToRecent: (id) => {
        set((s) => ({
          recentlyPlayed: [id, ...s.recentlyPlayed.filter((i) => i !== id)].slice(0, 10),
        }))
      },

      getSongById: (id) => get().songs.find((s) => s.id === id),

      getFavorites: () => get().songs.filter((s) => s.isFavorite),

      getRecent: () => {
        const { songs, recentlyPlayed } = get()
        return recentlyPlayed
          .map((id) => songs.find((s) => s.id === id))
          .filter((s): s is Song => s !== undefined)
      },
    }),
    {
      name: 'song-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        recentlyPlayed: state.recentlyPlayed,
        songs: state.songs.map((s) => ({ id: s.id, isFavorite: s.isFavorite })),
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<SongState>
        // 合并收藏状态到 Mock 数据
        const mergedSongs = currentState.songs.map((song) => {
          const savedSong = persisted.songs?.find((s) => s.id === song.id)
          return savedSong ? { ...song, isFavorite: savedSong.isFavorite } : song
        })
        return {
          ...currentState,
          ...persisted,
          songs: mergedSongs,
        }
      },
    }
  )
)
