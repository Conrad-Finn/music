'use client'

import { ChevronUp, Music } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePlayerStore } from '@/lib/stores/player-store'
import { useAppStore } from '@/lib/stores/app-store'
import { PlayerControls } from './PlayerControls'
import { ProgressBar } from './ProgressBar'

interface MiniPlayerProps {
  className?: string
  onExpand?: () => void
}

export function MiniPlayer({ className, onExpand }: MiniPlayerProps) {
  const { currentSong, isPlaying, currentTime, duration, volume, togglePlay, seek, setVolume } =
    usePlayerStore()
  const { showMiniPlayer } = useAppStore()

  if (!showMiniPlayer || !currentSong) {
    return null
  }

  return (
    <div
      className={cn(
        'fixed bottom-14 left-0 right-0 z-40',
        'bg-background/95 backdrop-blur-md border-t',
        'px-4 py-2',
        'md:bottom-0',
        className
      )}
    >
      {/* 进度条 - 顶部细线 */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-200"
          style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
        />
      </div>

      <div className="flex items-center gap-3">
        {/* 封面和歌曲信息 */}
        <button
          onClick={onExpand}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
          aria-label="展开播放器"
        >
          {/* 封面占位 */}
          <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
            {currentSong.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentSong.coverUrl}
                alt={currentSong.title}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.nextElementSibling?.classList.remove('hidden')
                }}
              />
            ) : null}
            <Music className={cn('h-6 w-6 text-muted-foreground', currentSong.coverUrl && 'hidden')} />
          </div>

          {/* 歌曲信息 */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{currentSong.title}</p>
            <p className="text-xs text-muted-foreground truncate">{currentSong.artist}</p>
          </div>

          {/* 展开箭头 */}
          <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </button>

        {/* 播放控制 */}
        <PlayerControls
          isPlaying={isPlaying}
          volume={volume}
          onPlayPause={togglePlay}
          onVolumeChange={setVolume}
          size="sm"
          showVolume={false}
          showSkipButtons={false}
        />
      </div>

      {/* 桌面端显示完整进度条 */}
      <div className="hidden md:block mt-2">
        <ProgressBar
          currentTime={currentTime}
          duration={duration}
          onSeek={seek}
          showTime={true}
        />
      </div>
    </div>
  )
}
