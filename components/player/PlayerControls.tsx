'use client'

import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Repeat1 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

interface PlayerControlsProps {
  isPlaying: boolean
  volume: number
  repeatMode?: 'off' | 'one' | 'all'
  onPlayPause: () => void
  onPrevious?: () => void
  onNext?: () => void
  onVolumeChange?: (volume: number) => void
  onRepeatModeChange?: () => void
  size?: 'sm' | 'md' | 'lg'
  showVolume?: boolean
  showSkipButtons?: boolean  // 是否显示上下首按钮
  className?: string
}

export function PlayerControls({
  isPlaying,
  volume,
  repeatMode = 'off',
  onPlayPause,
  onPrevious,
  onNext,
  onVolumeChange,
  onRepeatModeChange,
  size = 'md',
  showVolume = true,
  showSkipButtons = true,
  className,
}: PlayerControlsProps) {
  const iconSize = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }[size]

  const playIconSize = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }[size]

  const buttonSize = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  }[size]

  const isMuted = volume === 0

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* 上一首 */}
      {showSkipButtons && (
        <Button
          variant="ghost"
          size="icon"
          className={buttonSize}
          onClick={onPrevious}
          disabled={!onPrevious}
          aria-label="上一首"
        >
          <SkipBack className={iconSize} />
        </Button>
      )}

      {/* 播放/暂停 */}
      <Button
        variant="default"
        size="icon"
        className={cn(buttonSize, 'rounded-full')}
        onClick={onPlayPause}
        aria-label={isPlaying ? '暂停' : '播放'}
        aria-pressed={isPlaying}
      >
        {isPlaying ? (
          <Pause className={playIconSize} />
        ) : (
          <Play className={cn(playIconSize, 'ml-0.5')} />
        )}
      </Button>

      {/* 下一首 */}
      {showSkipButtons && (
        <Button
          variant="ghost"
          size="icon"
          className={buttonSize}
          onClick={onNext}
          disabled={!onNext}
          aria-label="下一首"
        >
          <SkipForward className={iconSize} />
        </Button>
      )}

      {/* 循环模式 */}
      {onRepeatModeChange && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(buttonSize, repeatMode !== 'off' && 'text-primary')}
          onClick={onRepeatModeChange}
          aria-label={
            repeatMode === 'off' ? '关闭循环' :
            repeatMode === 'one' ? '单曲循环' : '列表循环'
          }
        >
          {repeatMode === 'one' ? (
            <Repeat1 className={iconSize} />
          ) : (
            <Repeat className={iconSize} />
          )}
        </Button>
      )}

      {/* 音量控制 */}
      {showVolume && onVolumeChange && (
        <div className="flex items-center gap-2 ml-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onVolumeChange(isMuted ? 0.5 : 0)}
            aria-label={isMuted ? '取消静音' : '静音'}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[volume * 100]}
            max={100}
            step={1}
            className="w-20"
            onValueChange={([value]) => onVolumeChange(value / 100)}
            aria-label="音量"
          />
        </div>
      )}
    </div>
  )
}
