'use client'

import { Heart, Play, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Song } from '@/types'

interface SongListItemProps {
  song: Song
  index?: number
  isPlaying?: boolean
  onPlay?: () => void
  onFavorite?: () => void
  className?: string
}

// 格式化时长
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function SongListItem({
  song,
  index,
  isPlaying = false,
  onPlay,
  onFavorite,
  className,
}: SongListItemProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg',
        'hover:bg-muted/50 cursor-pointer transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-primary/20',
        isPlaying && 'bg-primary/10',
        className
      )}
      onClick={onPlay}
      onKeyDown={(e) => e.key === 'Enter' && onPlay?.()}
    >
      {/* 序号或播放图标 */}
      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
        {isPlaying ? (
          <div className="w-4 h-4 rounded-full bg-primary animate-pulse" />
        ) : index !== undefined ? (
          <span className="text-sm text-muted-foreground">{index + 1}</span>
        ) : (
          <Play className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      {/* 封面 */}
      <div className="w-12 h-12 rounded bg-muted flex-shrink-0 overflow-hidden">
        {song.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={song.coverUrl}
            alt={song.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xl">🎵</span>
          </div>
        )}
      </div>

      {/* 歌曲信息 */}
      <div className="flex-1 min-w-0">
        <p className={cn('font-medium truncate', isPlaying && 'text-primary')}>
          {song.title}
        </p>
        <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
      </div>

      {/* 时长 */}
      <span className="text-sm text-muted-foreground tabular-nums flex-shrink-0">
        {formatDuration(song.duration)}
      </span>

      {/* 收藏按钮 */}
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation()
          onFavorite?.()
        }}
      >
        <Heart
          className={cn(
            'h-4 w-4',
            song.isFavorite ? 'text-red-500 fill-current' : 'text-muted-foreground'
          )}
        />
      </Button>
    </div>
  )
}
