'use client'

import { Heart, Play } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Song } from '@/types'
import { DIFFICULTY_LABELS, GENRE_LABELS } from '@/lib/constants/messages'

interface SongCardProps {
  song: Song
  onPlay?: () => void
  onFavorite?: () => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function SongCard({
  song,
  onPlay,
  onFavorite,
  className,
  size = 'md',
}: SongCardProps) {
  const sizeClasses = {
    sm: 'w-32',
    md: 'w-40',
    lg: 'w-48',
  }

  const coverSizes = {
    sm: 'h-32',
    md: 'h-40',
    lg: 'h-48',
  }

  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all duration-200 hover:shadow-lg overflow-hidden',
        sizeClasses[size],
        className
      )}
      onClick={onPlay}
    >
      {/* 封面 */}
      <div className={cn('relative bg-muted', coverSizes[size])}>
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
            <span className="text-4xl">🎵</span>
          </div>
        )}

        {/* 播放按钮覆盖层 */}
        <div
          className={cn(
            'absolute inset-0 bg-black/40 flex items-center justify-center',
            'opacity-0 group-hover:opacity-100 transition-opacity'
          )}
        >
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full h-12 w-12"
            onClick={(e) => {
              e.stopPropagation()
              onPlay?.()
            }}
          >
            <Play className="h-6 w-6 ml-0.5" />
          </Button>
        </div>

        {/* 收藏按钮 */}
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            'absolute top-2 right-2 h-8 w-8 rounded-full',
            'bg-black/20 hover:bg-black/40',
            song.isFavorite ? 'text-red-500' : 'text-white'
          )}
          onClick={(e) => {
            e.stopPropagation()
            onFavorite?.()
          }}
        >
          <Heart
            className={cn('h-4 w-4', song.isFavorite && 'fill-current')}
          />
        </Button>

        {/* 难度标签 */}
        {song.difficulty && (
          <Badge
            variant="secondary"
            className="absolute bottom-2 left-2 text-xs"
          >
            {DIFFICULTY_LABELS[song.difficulty]}
          </Badge>
        )}
      </div>

      {/* 歌曲信息 */}
      <CardContent className="p-3">
        <p className="font-medium text-sm truncate">{song.title}</p>
        <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
        {song.genre && (
          <Badge variant="outline" className="mt-1 text-xs">
            {GENRE_LABELS[song.genre]}
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}
