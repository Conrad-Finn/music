'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Sparkles, Music, Heart, Star } from 'lucide-react'

interface FamiliarityToastProps {
  show: boolean
  songTitle?: string
  masteredCount: number
  totalCount: number
  onClose?: () => void
}

const messages = [
  { threshold: 0.2, message: '你开始认识这首歌了', icon: Music },
  { threshold: 0.4, message: '你和这首歌越来越熟了', icon: Heart },
  { threshold: 0.6, message: '这首歌已经是老朋友了', icon: Star },
  { threshold: 0.8, message: '你几乎完全掌握了这首歌', icon: Sparkles },
  { threshold: 1.0, message: '太棒了！你完全掌握了这首歌', icon: Sparkles },
]

export function FamiliarityToast({
  show,
  songTitle,
  masteredCount,
  totalCount,
  onClose,
}: FamiliarityToastProps) {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (show) {
      setVisible(true)
      setLeaving(false)

      const timer = setTimeout(() => {
        setLeaving(true)
        setTimeout(() => {
          setVisible(false)
          onClose?.()
        }, 300)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [show, onClose])

  if (!visible || totalCount === 0) return null

  const progress = masteredCount / totalCount
  const messageData = messages.find((m) => progress <= m.threshold) || messages[messages.length - 1]
  const IconComponent = messageData.icon

  return (
    <div
      className={cn(
        'fixed top-20 left-1/2 -translate-x-1/2 z-50',
        'bg-gradient-to-r from-amber-500/90 to-orange-500/90 backdrop-blur-sm',
        'text-white px-6 py-4 rounded-2xl shadow-lg',
        'flex items-center gap-3 min-w-[280px]',
        'transition-all duration-300',
        leaving ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'
      )}
    >
      <div className="p-2 bg-white/20 rounded-full">
        <IconComponent className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <p className="font-medium">{messageData.message}</p>
        {songTitle && (
          <p className="text-sm text-white/80 mt-0.5">{songTitle}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span className="text-xs text-white/80">
            {masteredCount}/{totalCount}
          </span>
        </div>
      </div>
    </div>
  )
}

// 进度卡片组件 - 用于歌曲详情页显示学习进度
interface ProgressCardProps {
  songTitle: string
  masteredCount: number
  learningCount: number
  totalCount: number
  className?: string
}

export function ProgressCard({
  songTitle,
  masteredCount,
  learningCount,
  totalCount,
  className,
}: ProgressCardProps) {
  if (totalCount === 0) return null

  const progress = masteredCount / totalCount
  const familiarityLevel =
    progress >= 0.8 ? '非常熟悉' :
    progress >= 0.6 ? '比较熟悉' :
    progress >= 0.4 ? '有些熟悉' :
    progress >= 0.2 ? '初步了解' :
    '刚开始'

  return (
    <div
      className={cn(
        'bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4',
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm text-muted-foreground">与这首歌的熟悉度</p>
          <p className="text-lg font-medium">{familiarityLevel}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">
            {Math.round(progress * 100)}%
          </p>
        </div>
      </div>

      {/* 进度条 */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* 统计数据 */}
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div>
          <p className="font-medium text-green-600">{masteredCount}</p>
          <p className="text-xs text-muted-foreground">已掌握</p>
        </div>
        <div>
          <p className="font-medium text-amber-600">{learningCount}</p>
          <p className="text-xs text-muted-foreground">学习中</p>
        </div>
        <div>
          <p className="font-medium text-muted-foreground">{totalCount - masteredCount - learningCount}</p>
          <p className="text-xs text-muted-foreground">未学习</p>
        </div>
      </div>
    </div>
  )
}
