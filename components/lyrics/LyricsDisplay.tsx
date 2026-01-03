'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LyricLine } from './LyricLine'
import type { Line } from '@/types'

interface LyricsDisplayProps {
  lines: Line[]
  currentTime: number
  onLineClick?: (line: Line) => void
  onLineFavorite?: (line: Line, favorited: boolean) => void
  learnedLineIds?: Set<string>
  favoritedLineIds?: Set<string>
  className?: string
  autoScroll?: boolean
}

export function LyricsDisplay({
  lines,
  currentTime,
  onLineClick,
  onLineFavorite,
  learnedLineIds = new Set(),
  favoritedLineIds = new Set(),
  className,
  autoScroll = true,
}: LyricsDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const currentLineRef = useRef<HTMLDivElement>(null)

  // 找到当前播放的行
  const currentLineIndex = lines.findIndex(
    (line) => currentTime >= line.startTime && currentTime < line.endTime
  )

  // 自动滚动到当前行
  useEffect(() => {
    if (!autoScroll || currentLineIndex < 0) return

    const timer = setTimeout(() => {
      currentLineRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 100)

    return () => clearTimeout(timer)
  }, [currentLineIndex, autoScroll])

  if (lines.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <p className="text-muted-foreground text-center">
          暂无歌词
          <br />
          <span className="text-sm">点击歌曲添加歌词</span>
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className={cn('h-full', className)}>
      <div ref={containerRef} className="py-4">
        {lines.map((line, index) => (
          <div
            key={line.id}
            ref={index === currentLineIndex ? currentLineRef : undefined}
          >
            <LyricLine
              line={line}
              isCurrent={index === currentLineIndex}
              isLearned={learnedLineIds.has(line.id)}
              isFavorited={favoritedLineIds.has(line.id)}
              onLearn={onLineClick}
              onFavorite={onLineFavorite}
            />
          </div>
        ))}

        {/* 底部留白，确保最后一行可以滚动到中间 */}
        <div className="h-48" aria-hidden="true" />
      </div>
    </ScrollArea>
  )
}
