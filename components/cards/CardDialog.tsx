'use client'

import { Clock, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Card as CardType, CardStatus } from '@/types'

interface CardDialogProps {
  card: CardType | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange?: (id: string, status: CardStatus) => void
  isGenerating?: boolean
}

export function CardDialog({
  card,
  open,
  onOpenChange,
  onStatusChange,
  isGenerating = false,
}: CardDialogProps) {
  const handleStatusChange = (status: CardStatus) => {
    if (card && onStatusChange) {
      onStatusChange(card.id, status)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {isGenerating ? (
          // 生成中状态
          <div className="flex flex-col items-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">正在解析词汇...</p>
          </div>
        ) : card ? (
          // 词卡内容
          <>
            <DialogHeader className="text-center">
              <DialogTitle className="text-3xl font-bold">{card.word}</DialogTitle>
              <p className="text-lg text-muted-foreground">{card.reading}</p>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  释义
                </h4>
                <p className="text-lg">{card.meaning}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  例句
                </h4>
                <p className="text-base italic text-muted-foreground">
                  {card.exampleSentence}
                </p>
              </div>

              {card.partOfSpeech && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    词性
                  </h4>
                  <p className="text-sm">
                    {card.partOfSpeech === 'noun' && '名词'}
                    {card.partOfSpeech === 'verb' && '动词'}
                    {card.partOfSpeech === 'adj' && '形容词'}
                    {card.partOfSpeech === 'other' && '其他'}
                  </p>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleStatusChange('learning')}
              >
                <Clock className="w-4 h-4 mr-2" />
                再看看
              </Button>
              <Button className="flex-1" onClick={() => handleStatusChange('mastered')}>
                <CheckCircle className="w-4 h-4 mr-2" />
                懂了
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
