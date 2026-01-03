'use client'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { Card as CardType, CardStatus } from '@/types'
import { STATUS_LABELS } from '@/lib/constants/messages'

interface WordCardProps {
  card: CardType
  showBack?: boolean
  onClick?: () => void
  className?: string
}

const statusColors: Record<CardStatus, string> = {
  new: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  learning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  mastered: 'bg-green-500/10 text-green-500 border-green-500/20',
}

export function WordCard({ card, showBack = false, onClick, className }: WordCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-300 hover:shadow-lg',
        'min-h-[200px] flex flex-col',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center justify-center flex-1 p-6">
        {/* 状态标签 */}
        <Badge
          variant="outline"
          className={cn('absolute top-3 right-3', statusColors[card.status])}
        >
          {STATUS_LABELS[card.status]}
        </Badge>

        {showBack ? (
          // 背面：释义和例句
          <div className="text-center space-y-4 w-full">
            <div>
              <p className="text-2xl font-bold">{card.word}</p>
              <p className="text-lg text-muted-foreground">{card.reading}</p>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-1">释义</p>
              <p className="text-lg">{card.meaning}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">例句</p>
              <p className="text-base italic text-muted-foreground">
                {card.exampleSentence}
              </p>
            </div>
          </div>
        ) : (
          // 正面：词汇和假名
          <div className="text-center">
            <p className="text-4xl font-bold mb-2">{card.word}</p>
            <p className="text-xl text-muted-foreground">{card.reading}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
