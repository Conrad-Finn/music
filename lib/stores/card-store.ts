'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Card, CardStatus } from '@/types'
import { MOCK_CARDS } from '@/data/mock/cards'

interface CardState {
  cards: Card[]
  currentCardId: string | null
  favoritedLineIds: string[]  // 收藏的歌词行 ID

  // 动作
  addCard: (data: Omit<Card, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => string
  updateStatus: (id: string, status: CardStatus) => void
  deleteCard: (id: string) => void
  setCurrentCard: (id: string | null) => void

  // 收藏动作
  toggleFavoriteLine: (lineId: string) => boolean  // 返回新状态
  isFavoritedLine: (lineId: string) => boolean
  getFavoritedLineIds: () => Set<string>

  // 查询
  getCardById: (id: string) => Card | undefined
  getCardsBySong: (songId: string) => Card[]
  getCardsByStatus: (status: CardStatus) => Card[]
  getCardStats: () => { new: number; learning: number; mastered: number; total: number }
}

// 生成唯一 ID
function generateId(): string {
  return `card-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export const useCardStore = create<CardState>()(
  persist(
    (set, get) => ({
      cards: MOCK_CARDS,
      currentCardId: null,
      favoritedLineIds: [],

      // 切换收藏状态
      toggleFavoriteLine: (lineId: string) => {
        const { favoritedLineIds } = get()
        const isFavorited = favoritedLineIds.includes(lineId)
        if (isFavorited) {
          set({ favoritedLineIds: favoritedLineIds.filter((id) => id !== lineId) })
          return false
        } else {
          set({ favoritedLineIds: [...favoritedLineIds, lineId] })
          return true
        }
      },

      isFavoritedLine: (lineId: string) => {
        return get().favoritedLineIds.includes(lineId)
      },

      getFavoritedLineIds: () => {
        return new Set(get().favoritedLineIds)
      },

      addCard: (data) => {
        const id = generateId()
        const now = new Date().toISOString()
        const newCard: Card = {
          ...data,
          id,
          status: 'new',
          createdAt: now,
          updatedAt: now,
        }
        set((s) => ({ cards: [newCard, ...s.cards] }))
        return id
      },

      updateStatus: (id, status) => {
        set((s) => ({
          cards: s.cards.map((c) =>
            c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c
          ),
        }))
      },

      deleteCard: (id) => {
        set((s) => ({
          cards: s.cards.filter((c) => c.id !== id),
          currentCardId: s.currentCardId === id ? null : s.currentCardId,
        }))
      },

      setCurrentCard: (id) => set({ currentCardId: id }),

      getCardById: (id) => get().cards.find((c) => c.id === id),

      getCardsBySong: (songId) => get().cards.filter((c) => c.songId === songId),

      getCardsByStatus: (status) => get().cards.filter((c) => c.status === status),

      getCardStats: () => {
        const cards = get().cards
        return {
          new: cards.filter((c) => c.status === 'new').length,
          learning: cards.filter((c) => c.status === 'learning').length,
          mastered: cards.filter((c) => c.status === 'mastered').length,
          total: cards.length,
        }
      },
    }),
    {
      name: 'card-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
