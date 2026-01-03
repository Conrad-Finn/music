'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SongCard {
  id: string
  lineId: string
  word: string
  reading: string | null
  meaning: string
  partOfSpeech: string | null
  exampleSentence: string | null
  exampleTranslation: string | null
  lineNumber: number
  contentJa: string
  contentZh: string | null
}

const partOfSpeechLabels: Record<string, string> = {
  noun: '名词',
  verb: '动词',
  adjective: '形容词',
  adverb: '副词',
  particle: '助词',
  other: '其他',
}

function CardItem({ card, onClick }: { card: SongCard; onClick: () => void }) {
  return (
    <Card
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">{card.word}</span>
              {card.reading && (
                <span className="text-sm text-muted-foreground">
                  [{card.reading}]
                </span>
              )}
            </div>
            <p className="text-sm mt-1">{card.meaning}</p>
          </div>
          {card.partOfSpeech && (
            <Badge variant="secondary" className="text-xs">
              {partOfSpeechLabels[card.partOfSpeech] || card.partOfSpeech}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2 truncate">
          来自: {card.contentJa}
        </p>
      </CardContent>
    </Card>
  )
}

function CardDetailDialog({
  card,
  open,
  onClose,
}: {
  card: SongCard | null
  open: boolean
  onClose: () => void
}) {
  if (!open || !card) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-lg max-w-md w-full p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 词汇 */}
        <div className="text-center">
          <h2 className="text-3xl font-bold">{card.word}</h2>
          {card.reading && (
            <p className="text-lg text-muted-foreground">{card.reading}</p>
          )}
        </div>

        {/* 词性 */}
        {card.partOfSpeech && (
          <div className="flex justify-center">
            <Badge variant="secondary">
              {partOfSpeechLabels[card.partOfSpeech] || card.partOfSpeech}
            </Badge>
          </div>
        )}

        {/* 释义 */}
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-lg">{card.meaning}</p>
        </div>

        {/* 例句 */}
        <div className="space-y-2">
          <p className="text-sm font-medium">例句:</p>
          <p className="text-base">{card.contentJa}</p>
          {card.contentZh && (
            <p className="text-sm text-muted-foreground">{card.contentZh}</p>
          )}
        </div>

        <Button className="w-full" onClick={onClose}>
          关闭
        </Button>
      </div>
    </div>
  )
}

export default function SongCardsPage() {
  const params = useParams()
  const router = useRouter()
  const songId = params.id as string

  const [cards, setCards] = useState<SongCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<SongCard | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    async function fetchCards() {
      try {
        const res = await fetch(`/api/songs/${songId}/cards`)
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || '获取词卡失败')
          return
        }

        setCards(data.data)
      } catch (err) {
        setError('网络错误')
      } finally {
        setLoading(false)
      }
    }

    if (songId) {
      fetchCards()
    }
  }, [songId])

  const handleCardClick = (card: SongCard) => {
    setSelectedCard(card)
    setDialogOpen(true)
  }

  if (loading) {
    return (
      <AppShell>
        <Header title="加载中..." showBack showHome />
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <Header title="错误" showBack showHome />
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground">{error}</p>
          <Button className="mt-4" onClick={() => router.back()}>
            返回
          </Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <Header title="词卡" showBack showHome />

      {/* 统计 */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <p className="text-sm text-muted-foreground">
          共 {cards.length} 张词卡
        </p>
      </div>

      <ScrollArea className="h-[calc(100vh-56px-48px-120px)]">
        <div className="p-4 space-y-3">
          {cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-4xl mb-4">📚</span>
              <p className="text-muted-foreground">这首歌还没有词卡</p>
            </div>
          ) : (
            cards.map((card) => (
              <CardItem
                key={card.id}
                card={card}
                onClick={() => handleCardClick(card)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <CardDetailDialog
        card={selectedCard}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </AppShell>
  )
}
