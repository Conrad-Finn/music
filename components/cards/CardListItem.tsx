'use client'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { Card } from '@/types'
import { STATUS_LABELS } from '@/lib/constants/messages'

interface CardListItemProps {
  card: Card
  onClick?: () => void
  className?: string
}

export function CardListItem({ card, onClick, className }: CardListItemProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'flex items-center justify-between p-3 rounded-lg',
        'bg-card hover:bg-muted/50 cursor-pointer transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-primary/20',
        className
      )}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-lg font-medium">{card.word}</span>
          <span className="text-sm text-muted-foreground">{card.reading}</span>
        </div>
        <p className="text-sm text-muted-foreground truncate">{card.meaning}</p>
      </div>

      <Badge
        variant="outline"
        className={cn(
          'ml-2 flex-shrink-0',
          card.status === 'new' && 'border-blue-500/50 text-blue-500',
          card.status === 'learning' && 'border-amber-500/50 text-amber-500',
          card.status === 'mastered' && 'border-green-500/50 text-green-500'
        )}
      >
        {STATUS_LABELS[card.status]}
      </Badge>
    </div>
  )
}
