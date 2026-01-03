'use client'

import { useState } from 'react'
import { Plus, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Line } from '@/types'

interface LyricLineProps {
  line: Line
  isCurrent: boolean
  isLearned?: boolean
  isFavorited?: boolean
  onLearn?: (line: Line) => void
  onFavorite?: (line: Line, favorited: boolean) => void
  className?: string
}

export function LyricLine({
  line,
  isCurrent,
  isLearned = false,
  isFavorited = false,
  onLearn,
  onFavorite,
  className,
}: LyricLineProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [localFavorited, setLocalFavorited] = useState(isFavorited)

  const handleClick = () => {
    if (onLearn) {
      onLearn(line)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newFavorited = !localFavorited
    setLocalFavorited(newFavorited)

    // 收藏时触发动画
    if (newFavorited) {
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 300)
    }

    if (onFavorite) {
      onFavorite(line, newFavorited)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'group relative px-4 py-3 cursor-pointer transition-all duration-200',
        'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20',
        isCurrent && 'bg-primary/10',
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-line-id={line.id}
      data-favorited={localFavorited}
      aria-label={`点击学习：${line.contentJa}`}
      aria-current={isCurrent ? 'true' : undefined}
    >
      {/* 日文歌词 */}
      <p
        className={cn(
          'text-lg transition-all duration-200 pr-16',
          isCurrent ? 'font-medium text-foreground' : 'text-foreground/80',
          isLearned && 'underline decoration-primary/50 decoration-2 underline-offset-4'
        )}
      >
        {line.contentJa}
      </p>

      {/* 假名注音（可选显示） */}
      {line.furigana && line.furigana.length > 0 && isCurrent && (
        <p className="text-xs text-muted-foreground mt-0.5">
          {line.furigana.map(f => f.reading).join(' ')}
        </p>
      )}

      {/* 中文翻译 */}
      <p className="text-sm text-muted-foreground mt-1 pr-16">{line.contentZh}</p>

      {/* 操作按钮区域 */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {/* 收藏按钮 - 爱心 */}
        <button
          type="button"
          onClick={handleFavorite}
          className={cn(
            'p-1.5 rounded-full transition-all duration-200',
            'hover:bg-rose-100 dark:hover:bg-rose-900/30',
            'focus:outline-none focus:ring-2 focus:ring-rose-500/20',
            localFavorited ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
          aria-label={localFavorited ? '取消收藏' : '收藏这句'}
          data-action="favorite"
        >
          <Heart
            className={cn(
              'w-5 h-5 transition-all duration-200',
              localFavorited
                ? 'fill-rose-500 text-rose-500'
                : 'text-muted-foreground hover:text-rose-500',
              isAnimating && 'scale-125'
            )}
          />
        </button>

        {/* 学习按钮 - 加号 */}
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            'p-1.5 rounded-full transition-all duration-200',
            'hover:bg-primary/10',
            'focus:outline-none focus:ring-2 focus:ring-primary/20',
            'opacity-0 group-hover:opacity-100'
          )}
          aria-label="生成词卡"
        >
          <Plus className="w-5 h-5 text-primary" />
        </button>
      </div>
    </div>
  )
}
