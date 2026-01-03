'use client'

import { cn } from '@/lib/utils'
import { Slider } from '@/components/ui/slider'

interface ProgressBarProps {
  currentTime: number
  duration: number
  onSeek?: (time: number) => void
  className?: string
  showTime?: boolean
}

// 格式化时间 (秒 -> mm:ss)
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function ProgressBar({
  currentTime,
  duration,
  onSeek,
  className,
  showTime = true,
}: ProgressBarProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleSeek = (value: number[]) => {
    if (onSeek && duration > 0) {
      const newTime = (value[0] / 100) * duration
      onSeek(newTime)
    }
  }

  return (
    <div className={cn('flex items-center gap-2 w-full', className)}>
      {showTime && (
        <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
          {formatTime(currentTime)}
        </span>
      )}

      <Slider
        value={[progress]}
        max={100}
        step={0.1}
        className="flex-1"
        onValueChange={handleSeek}
        aria-label="播放进度"
      />

      {showTime && (
        <span className="text-xs text-muted-foreground w-10 tabular-nums">
          {formatTime(duration)}
        </span>
      )}
    </div>
  )
}
