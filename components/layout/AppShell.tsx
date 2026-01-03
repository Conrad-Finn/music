'use client'

import { cn } from '@/lib/utils'
import { BottomNav } from './BottomNav'
import { MockModeIndicator } from './MockModeIndicator'
import { MiniPlayer } from '@/components/player/MiniPlayer'

interface AppShellProps {
  children: React.ReactNode
  className?: string
  showNav?: boolean
  showPlayer?: boolean
}

export function AppShell({
  children,
  className,
  showNav = true,
  showPlayer = true,
}: AppShellProps) {
  return (
    <div className={cn('min-h-screen bg-background', className)}>
      {/* Mock 模式指示器 */}
      <MockModeIndicator />

      {/* 主内容区域 */}
      <main
        className={cn(
          'flex-1 animate-page-in',
          showNav && 'pb-14 md:pb-0', // 底部导航空间
          showPlayer && 'pb-28 md:pb-20' // 播放器空间
        )}
      >
        {children}
      </main>

      {/* 迷你播放器 */}
      {showPlayer && <MiniPlayer />}

      {/* 底部导航 */}
      {showNav && <BottomNav />}
    </div>
  )
}
