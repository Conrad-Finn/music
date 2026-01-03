'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FamiliarityToast } from '@/components/progress'
import { cn } from '@/lib/utils'
import { Pencil, Trash2, X, Check, GraduationCap } from 'lucide-react'
import { StudyMode } from '@/components/cards'

interface CardItem {
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
  songId: string
  songTitle: string
  songArtist: string | null
  progress?: {
    status: string
    reviewCount: number
  }
}

interface SongGroup {
  songId: string
  songTitle: string
  songArtist: string | null
  cards: CardItem[]
}

interface Stats {
  total: number
  new: number
  learning: number
  mastered: number
}

const partOfSpeechLabels: Record<string, string> = {
  noun: '名词',
  verb: '动词',
  adjective: '形容词',
  adverb: '副词',
  particle: '助词',
  other: '其他',
}

type FilterType = 'all' | 'new' | 'learning' | 'mastered'

function CardDetailDialog({
  card,
  open,
  onClose,
  onUpdate,
  onDelete,
}: {
  card: CardItem | null
  open: boolean
  onClose: () => void
  onUpdate: (id: string, data: Partial<CardItem>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editData, setEditData] = useState({
    word: '',
    reading: '',
    meaning: '',
    partOfSpeech: '' as string,
  })

  // 当 card 改变时重置编辑状态
  useEffect(() => {
    if (card) {
      setEditData({
        word: card.word,
        reading: card.reading || '',
        meaning: card.meaning,
        partOfSpeech: card.partOfSpeech || 'other',
      })
    }
    setIsEditing(false)
    setConfirmDelete(false)
  }, [card])

  if (!open || !card) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      await onUpdate(card.id, editData)
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    try {
      await onDelete(card.id)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-lg max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部操作按钮 */}
        <div className="flex justify-end gap-2">
          {isEditing ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsEditing(false)
                  setEditData({
                    word: card.word,
                    reading: card.reading || '',
                    meaning: card.meaning,
                    partOfSpeech: card.partOfSpeech || 'other',
                  })
                }}
              >
                <X className="w-4 h-4" />
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Check className="w-4 h-4 mr-1" />
                {saving ? '保存中...' : '保存'}
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={confirmDelete ? 'destructive' : 'ghost'}
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="w-4 h-4" />
                {confirmDelete && <span className="ml-1">确认删除?</span>}
              </Button>
            </>
          )}
        </div>

        {isEditing ? (
          /* 编辑模式 */
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">词汇</label>
              <Input
                value={editData.word}
                onChange={(e) => setEditData({ ...editData, word: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">读音 (平假名)</label>
              <Input
                value={editData.reading}
                onChange={(e) => setEditData({ ...editData, reading: e.target.value })}
                className="mt-1"
                placeholder="ひらがな"
              />
            </div>
            <div>
              <label className="text-sm font-medium">词性</label>
              <select
                value={editData.partOfSpeech}
                onChange={(e) => setEditData({ ...editData, partOfSpeech: e.target.value })}
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="noun">名词</option>
                <option value="verb">动词</option>
                <option value="adjective">形容词</option>
                <option value="adverb">副词</option>
                <option value="particle">助词</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">释义</label>
              <Textarea
                value={editData.meaning}
                onChange={(e) => setEditData({ ...editData, meaning: e.target.value })}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
        ) : (
          /* 查看模式 */
          <>
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

            {/* 来源歌曲 */}
            <div className="text-xs text-muted-foreground pt-2 border-t">
              来自: {card.songTitle} {card.songArtist && `- ${card.songArtist}`}
            </div>
          </>
        )}

        <Button className="w-full" variant="outline" onClick={onClose}>
          关闭
        </Button>
      </div>
    </div>
  )
}

export default function CardsPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterType>('all')
  const [songGroups, setSongGroups] = useState<SongGroup[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, new: 0, learning: 0, mastered: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [studyMode, setStudyMode] = useState(false)
  const [showStudySettings, setShowStudySettings] = useState(false)
  const [studyLimit, setStudyLimit] = useState<number>(10)

  // 熟悉度反馈 toast 状态
  const [showFamiliarityToast, setShowFamiliarityToast] = useState(false)
  const [toastSongInfo, setToastSongInfo] = useState<{
    songTitle: string
    masteredCount: number
    totalCount: number
  } | null>(null)

  const fetchCards = async () => {
    try {
      const res = await fetch('/api/cards')
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '获取词卡失败')
        return
      }

      setSongGroups(data.data)
      setStats(data.stats)
    } catch (err) {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  // 初始加载 + 页面可见时刷新
  useEffect(() => {
    fetchCards()

    // 页面可见时刷新数据
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchCards()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const handleCardClick = (card: CardItem) => {
    setSelectedCard(card)
    setDialogOpen(true)
  }

  const handleUpdateCard = async (id: string, data: Partial<CardItem>) => {
    const res = await fetch(`/api/cards/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (res.ok) {
      const updated = await res.json()
      // 更新本地状态
      setSongGroups((groups) =>
        groups.map((group) => ({
          ...group,
          cards: group.cards.map((card) =>
            card.id === id ? { ...card, ...updated.data } : card
          ),
        }))
      )
      // 更新选中的卡片
      if (selectedCard?.id === id) {
        setSelectedCard({ ...selectedCard, ...updated.data })
      }
    }
  }

  const handleDeleteCard = async (id: string) => {
    const res = await fetch(`/api/cards/${id}`, {
      method: 'DELETE',
    })

    if (res.ok) {
      // 从本地状态中移除
      setSongGroups((groups) =>
        groups
          .map((group) => ({
            ...group,
            cards: group.cards.filter((card) => card.id !== id),
          }))
          .filter((group) => group.cards.length > 0)
      )
      // 更新统计
      setStats((prev) => ({
        ...prev,
        total: prev.total - 1,
        new: selectedCard?.progress?.status === 'new' || !selectedCard?.progress ? prev.new - 1 : prev.new,
        learning: selectedCard?.progress?.status === 'learning' ? prev.learning - 1 : prev.learning,
        mastered: selectedCard?.progress?.status === 'mastered' ? prev.mastered - 1 : prev.mastered,
      }))
    }
  }

  // 获取所有卡片用于学习模式
  const allCards = useMemo(() => {
    return songGroups.flatMap((group) =>
      group.cards.map((card) => ({
        ...card,
        status: (card.progress?.status || 'new') as 'new' | 'learning' | 'mastered',
      }))
    )
  }, [songGroups])

  // 应用学习数量限制的卡片（优先学习新词和学习中的）
  const studyCards = useMemo(() => {
    // 先排序：新词 > 学习中 > 已掌握
    const sorted = [...allCards].sort((a, b) => {
      const order = { new: 0, learning: 1, mastered: 2 }
      return order[a.status] - order[b.status]
    })
    return studyLimit === 0 ? sorted : sorted.slice(0, studyLimit)
  }, [allCards, studyLimit])

  // 处理学习模式中的状态变更
  const handleStudyStatusChange = async (
    cardId: string,
    status: 'new' | 'learning' | 'mastered'
  ) => {
    try {
      await fetch(`/api/cards/${cardId}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      // 更新本地状态
      setSongGroups((groups) =>
        groups.map((group) => ({
          ...group,
          cards: group.cards.map((card) =>
            card.id === cardId
              ? { ...card, progress: { ...card.progress, status, reviewCount: (card.progress?.reviewCount || 0) + 1 } }
              : card
          ),
        }))
      )

      // 更新统计
      const oldCard = allCards.find((c) => c.id === cardId)
      const oldStatus = oldCard?.status || 'new'
      if (oldStatus !== status) {
        setStats((prev) => ({
          ...prev,
          [oldStatus]: prev[oldStatus as keyof Stats] - 1,
          [status]: prev[status as keyof Stats] + 1,
        }))

        // 如果新状态是 mastered，显示熟悉度反馈
        if (status === 'mastered') {
          const card = allCards.find((c) => c.id === cardId)
          if (card) {
            const songGroup = songGroups.find((g) => g.songId === card.songId)
            if (songGroup) {
              const masteredCount = songGroup.cards.filter(
                (c) => c.progress?.status === 'mastered' || c.id === cardId
              ).length
              setToastSongInfo({
                songTitle: songGroup.songTitle,
                masteredCount,
                totalCount: songGroup.cards.length,
              })
              setShowFamiliarityToast(true)
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to update card progress:', err)
    }
  }

  // 按状态过滤
  const filteredGroups = songGroups.map(group => ({
    ...group,
    cards: group.cards.filter(card => {
      if (filter === 'all') return true
      const cardStatus = card.progress?.status || 'new'
      return cardStatus === filter
    })
  })).filter(group => group.cards.length > 0)

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: '全部', count: stats.total },
    { key: 'new', label: '新词', count: stats.new },
    { key: 'learning', label: '学习中', count: stats.learning },
    { key: 'mastered', label: '已掌握', count: stats.mastered },
  ]

  if (loading) {
    return (
      <AppShell>
        <Header title="词卡" showHome />
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <Header title="词卡" showHome />
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground">{error}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            重试
          </Button>
        </div>
      </AppShell>
    )
  }

  // 学习模式
  if (studyMode) {
    return (
      <AppShell>
        <StudyMode
          cards={studyCards}
          onStatusChange={handleStudyStatusChange}
          onComplete={() => {
            fetchCards() // 重新获取最新数据
          }}
          onClose={() => setStudyMode(false)}
        />
        {/* 熟悉度反馈 Toast */}
        <FamiliarityToast
          show={showFamiliarityToast}
          songTitle={toastSongInfo?.songTitle}
          masteredCount={toastSongInfo?.masteredCount || 0}
          totalCount={toastSongInfo?.totalCount || 0}
          onClose={() => setShowFamiliarityToast(false)}
        />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <Header title="词卡" showHome />

      {/* 统计栏 */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
        <div className="flex gap-2 overflow-x-auto">
          {filters.map((f) => (
            <Button
              key={f.key}
              variant={filter === f.key ? 'default' : 'outline'}
              size="sm"
              className={cn('flex-shrink-0 gap-1', filter === f.key && 'bg-primary')}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <Badge variant="secondary" className="ml-1 text-xs">
                {f.count}
              </Badge>
            </Button>
          ))}
        </div>
        {stats.total > 0 && (
          <Button
            size="sm"
            className="flex-shrink-0 gap-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            onClick={() => setShowStudySettings(true)}
          >
            <GraduationCap className="w-4 h-4" />
            开始学习
          </Button>
        )}
      </div>

      <ScrollArea className="h-[calc(100vh-56px-48px-120px)]">
        <div className="p-4">
          {filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-4xl mb-4">📚</span>
              <p className="text-muted-foreground">
                {filter === 'all' ? '还没有词卡' : `没有${filters.find((f) => f.key === filter)?.label}的词卡`}
              </p>
              <p className="text-sm text-muted-foreground mt-2">去导入歌曲学词吧</p>
              <Button
                className="mt-4"
                onClick={() => router.push('/songs/import')}
              >
                导入歌曲
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredGroups.map((group) => (
                <section key={group.songId}>
                  <div
                    className="flex items-center gap-2 mb-3 cursor-pointer hover:opacity-80"
                    onClick={() => router.push(`/songs/${group.songId}`)}
                  >
                    <span className="text-sm font-medium">{group.songTitle}</span>
                    {group.songArtist && (
                      <span className="text-xs text-muted-foreground">- {group.songArtist}</span>
                    )}
                    <Badge variant="outline" className="text-xs ml-auto">
                      {group.cards.length} 张
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {group.cards.map((card) => (
                      <Card
                        key={card.id}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => handleCardClick(card)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{card.word}</span>
                                {card.reading && (
                                  <span className="text-xs text-muted-foreground">
                                    [{card.reading}]
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate mt-1">
                                {card.meaning}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {card.partOfSpeech && (
                                <Badge variant="secondary" className="text-xs">
                                  {partOfSpeechLabels[card.partOfSpeech] || card.partOfSpeech}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 词卡详情弹窗 */}
      <CardDetailDialog
        card={selectedCard}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onUpdate={handleUpdateCard}
        onDelete={handleDeleteCard}
      />

      {/* 学习设置弹窗 */}
      {showStudySettings && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowStudySettings(false)}
        >
          <div
            className="bg-background rounded-lg max-w-sm w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-center">学习设置</h3>
            <p className="text-sm text-muted-foreground text-center">
              选择本次要学习的词卡数量
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 10, label: '10张' },
                { value: 20, label: '20张' },
                { value: 50, label: '50张' },
                { value: 0, label: '全部' },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={studyLimit === option.value ? 'default' : 'outline'}
                  className="h-12"
                  onClick={() => setStudyLimit(option.value)}
                >
                  {option.label}
                  {option.value === 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {stats.total}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              优先学习新词和学习中的词卡
            </p>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowStudySettings(false)}
              >
                取消
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                onClick={() => {
                  setShowStudySettings(false)
                  setStudyMode(true)
                }}
              >
                <GraduationCap className="w-4 h-4 mr-2" />
                开始
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
