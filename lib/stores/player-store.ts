'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Song, Line } from '@/types'
import { MOCK_SONGS } from '@/data/mock/songs'

interface PlayerState {
  // 状态
  currentSong: Song | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  currentLineIndex: number
  repeatMode: 'off' | 'one' | 'all'  // 循环模式

  // 播放列表
  playlist: Song[]
  playHistory: string[]  // 播放历史 (song ids)

  // Mock 模式
  useMockMode: boolean

  // 动作
  playSong: (song: Song) => void
  togglePlay: () => void
  pause: () => void
  play: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setMockMode: (mock: boolean) => void
  toggleRepeatMode: () => void  // 切换循环模式

  // 播放列表动作
  setPlaylist: (songs: Song[]) => void
  playNext: () => void
  playPrevious: () => void
  hasNext: () => boolean
  hasPrevious: () => boolean

  // 计算当前行
  getCurrentLine: () => Line | null
  updateCurrentLineByTime: (time: number) => void
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentSong: MOCK_SONGS[0] || null,
      isPlaying: false,
      currentTime: 0,
      duration: MOCK_SONGS[0]?.duration || 0,
      volume: 0.8,
      currentLineIndex: -1,
      repeatMode: 'off',
      playlist: MOCK_SONGS,
      playHistory: [],
      useMockMode: true,

      playSong: (song) => {
        const { playHistory } = get()
        // 添加到播放历史（去重，最多保留20首）
        const newHistory = [song.id, ...playHistory.filter(id => id !== song.id)].slice(0, 20)
        set({
          currentSong: song,
          isPlaying: true,
          currentTime: 0,
          duration: song.duration,
          currentLineIndex: -1,
          playHistory: newHistory,
        })
      },

      togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),

      pause: () => set({ isPlaying: false }),

      play: () => set({ isPlaying: true }),

      seek: (time) => {
        set({ currentTime: time })
        get().updateCurrentLineByTime(time)
      },

      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),

      setCurrentTime: (time) => set({ currentTime: time }),

      setDuration: (duration) => set({ duration }),

      setMockMode: (mock) => set({ useMockMode: mock }),

      toggleRepeatMode: () => {
        const { repeatMode } = get()
        const modes: ('off' | 'one' | 'all')[] = ['off', 'one', 'all']
        const currentIndex = modes.indexOf(repeatMode)
        const nextIndex = (currentIndex + 1) % modes.length
        set({ repeatMode: modes[nextIndex] })
      },

      // 播放列表功能
      setPlaylist: (songs) => set({ playlist: songs }),

      playNext: () => {
        const { currentSong, playlist, isPlaying } = get()
        if (!currentSong || playlist.length === 0) return

        const currentIndex = playlist.findIndex(s => s.id === currentSong.id)
        const nextIndex = currentIndex + 1
        if (nextIndex < playlist.length) {
          const nextSong = playlist[nextIndex]
          get().playSong(nextSong)
          // 保持播放状态
          if (!isPlaying) set({ isPlaying: true })
        }
      },

      playPrevious: () => {
        const { currentSong, playlist, isPlaying } = get()
        if (!currentSong || playlist.length === 0) return

        const currentIndex = playlist.findIndex(s => s.id === currentSong.id)
        const prevIndex = currentIndex - 1
        if (prevIndex >= 0) {
          const prevSong = playlist[prevIndex]
          get().playSong(prevSong)
          if (!isPlaying) set({ isPlaying: true })
        }
      },

      hasNext: () => {
        const { currentSong, playlist } = get()
        if (!currentSong || playlist.length === 0) return false
        const currentIndex = playlist.findIndex(s => s.id === currentSong.id)
        return currentIndex < playlist.length - 1
      },

      hasPrevious: () => {
        const { currentSong, playlist } = get()
        if (!currentSong || playlist.length === 0) return false
        const currentIndex = playlist.findIndex(s => s.id === currentSong.id)
        return currentIndex > 0
      },

      getCurrentLine: () => {
        const { currentSong, currentLineIndex } = get()
        if (!currentSong || currentLineIndex < 0) return null
        return currentSong.lines[currentLineIndex] || null
      },

      updateCurrentLineByTime: (time) => {
        const { currentSong } = get()
        if (!currentSong?.lines.length) {
          set({ currentLineIndex: -1 })
          return
        }

        const lineIndex = currentSong.lines.findIndex(
          (line) => time >= line.startTime && time < line.endTime
        )

        set({ currentLineIndex: lineIndex })
      },
    }),
    {
      name: 'player-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        volume: state.volume,
        useMockMode: state.useMockMode,
      }),
    }
  )
)
