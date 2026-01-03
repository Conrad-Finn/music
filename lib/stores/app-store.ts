'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface AppState {
  // UI 状态
  sidebarOpen: boolean
  theme: 'light' | 'dark' | 'system'
  showMiniPlayer: boolean
  isFullPlayerOpen: boolean

  // Mock 模式指示
  useMockMode: boolean

  // 动作
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setShowMiniPlayer: (show: boolean) => void
  setFullPlayerOpen: (open: boolean) => void
  setMockMode: (mock: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'dark',
      showMiniPlayer: true,
      isFullPlayerOpen: false,
      useMockMode: true,

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setTheme: (theme) => set({ theme }),
      setShowMiniPlayer: (show) => set({ showMiniPlayer: show }),
      setFullPlayerOpen: (open) => set({ isFullPlayerOpen: open }),
      setMockMode: (mock) => set({ useMockMode: mock }),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
