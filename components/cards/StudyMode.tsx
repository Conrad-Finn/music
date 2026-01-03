'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
  BookOpen,
  Sparkles,
  X,
  Volume2,
  Loader2,
} from 'lucide-react'
import { speakJapanese, stopSpeaking } from '@/lib/utils/tts'

interface FuriganaItem {
  word: string
  reading: string
  start: number
  end: number
}

interface StudyCard {
  id: string
  word: string
  reading: string | null
  meaning: string
  partOfSpeech: string | null
  exampleSentence: string | null
  exampleTranslation?: string | null
  contentJa?: string
  contentZh?: string | null
  furigana?: FuriganaItem[] | string | null
  status?: 'new' | 'learning' | 'mastered'
}

interface StudyModeProps {
  cards: StudyCard[]
  onStatusChange?: (cardId: string, status: 'new' | 'learning' | 'mastered') => void
  onComplete?: (stats: StudyStats) => void
  onClose?: () => void
}

interface StudyStats {
  total: number
  reviewed: number
  mastered: number
  learning: number
}

const partOfSpeechLabels: Record<string, string> = {
  noun: '名词',
  verb: '动词',
  adjective: '形容词',
  adverb: '副词',
  particle: '助词',
  other: '其他',
}

// 解析 furigana 数据
function parseFurigana(furigana: FuriganaItem[] | string | null | undefined): FuriganaItem[] {
  if (!furigana) return []
  if (typeof furigana === 'string') {
    try {
      return JSON.parse(furigana)
    } catch {
      return []
    }
  }
  return furigana
}

// 渲染带注音的文本
function TextWithFurigana({ text, furigana }: { text: string; furigana: FuriganaItem[] }) {
  if (furigana.length === 0) {
    return <span>{text}</span>
  }

  // 按位置排序
  const sortedItems = [...furigana].sort((a, b) => a.start - b.start)
  const result: React.ReactNode[] = []
  let lastEnd = 0

  sortedItems.forEach((item, index) => {
    // 添加注音前的普通文本
    if (item.start > lastEnd) {
      result.push(
        <span key={`text-${index}`}>
          {text.slice(lastEnd, item.start)}
        </span>
      )
    }

    // 添加带注音的文本
    const actualWord = text.slice(item.start, item.end)
    // 只有当读音和原词不同时才显示注音
    if (item.reading && item.reading !== actualWord) {
      result.push(
        <ruby key={`ruby-${index}`} className="ruby-annotation">
          {actualWord}
          <rp>(</rp>
          <rt className="text-[10px] text-muted-foreground">{item.reading}</rt>
          <rp>)</rp>
        </ruby>
      )
    } else {
      result.push(<span key={`word-${index}`}>{actualWord}</span>)
    }

    lastEnd = item.end
  })

  // 添加剩余文本
  if (lastEnd < text.length) {
    result.push(
      <span key="text-end">{text.slice(lastEnd)}</span>
    )
  }

  return <>{result}</>
}

export function StudyMode({
  cards,
  onStatusChange,
  onComplete,
  onClose,
}: StudyModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set())
  const [learningIds, setLearningIds] = useState<Set<string>>(new Set())
  const [showComplete, setShowComplete] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  const currentCard = cards[currentIndex]
  const progress = ((currentIndex + 1) / cards.length) * 100
  const hasProgress = masteredIds.size > 0 || learningIds.size > 0

  const handleClose = useCallback(() => {
    // 如果还没有任何进度，直接退出
    if (!hasProgress) {
      onClose?.()
      return
    }
    // 否则显示确认对话框
    setShowExitConfirm(true)
  }, [hasProgress, onClose])

  const handleConfirmExit = useCallback(() => {
    setShowExitConfirm(false)
    onComplete?.({
      total: cards.length,
      reviewed: currentIndex + 1,
      mastered: masteredIds.size,
      learning: learningIds.size,
    })
    onClose?.()
  }, [cards.length, currentIndex, masteredIds.size, learningIds.size, onComplete, onClose])

  const handleSpeak = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation() // 阻止事件冒泡，避免触发翻转

    if (isSpeaking) {
      stopSpeaking()
      setIsSpeaking(false)
      return
    }

    if (!currentCard) return

    try {
      setIsSpeaking(true)
      await speakJapanese(currentCard.word)
    } catch (error) {
      console.error('发音失败:', error)
    } finally {
      setIsSpeaking(false)
    }
  }, [currentCard, isSpeaking])

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev)
  }, [])

  const handleNext = useCallback(() => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setIsFlipped(false)
    } else {
      // 学习完成
      setShowComplete(true)
      onComplete?.({
        total: cards.length,
        reviewed: cards.length,
        mastered: masteredIds.size,
        learning: learningIds.size,
      })
    }
  }, [currentIndex, cards.length, masteredIds.size, learningIds.size, onComplete])

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      setIsFlipped(false)
    }
  }, [currentIndex])

  const handleMarkMastered = useCallback(() => {
    if (!currentCard) return

    setMasteredIds((prev) => new Set(prev).add(currentCard.id))
    setLearningIds((prev) => {
      const newSet = new Set(prev)
      newSet.delete(currentCard.id)
      return newSet
    })
    onStatusChange?.(currentCard.id, 'mastered')
    handleNext()
  }, [currentCard, onStatusChange, handleNext])

  const handleMarkLearning = useCallback(() => {
    if (!currentCard) return

    setLearningIds((prev) => new Set(prev).add(currentCard.id))
    setMasteredIds((prev) => {
      const newSet = new Set(prev)
      newSet.delete(currentCard.id)
      return newSet
    })
    onStatusChange?.(currentCard.id, 'learning')
    handleNext()
  }, [currentCard, onStatusChange, handleNext])

  const handleRestart = useCallback(() => {
    setCurrentIndex(0)
    setIsFlipped(false)
    setMasteredIds(new Set())
    setLearningIds(new Set())
    setShowComplete(false)
  }, [])

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <BookOpen className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-lg text-muted-foreground">没有可学习的词卡</p>
        <Button className="mt-4" variant="outline" onClick={onClose}>
          返回
        </Button>
      </div>
    )
  }

  // 学习完成界面
  if (showComplete) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8 px-4">
        <div className="text-center space-y-4">
          <Sparkles className="w-16 h-16 text-amber-500 mx-auto animate-pulse" />
          <h2 className="text-2xl font-bold">学习完成!</h2>
          <p className="text-muted-foreground">你和这首歌更熟了</p>

          <div className="grid grid-cols-3 gap-4 py-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{cards.length}</p>
              <p className="text-xs text-muted-foreground">总词卡</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-500">{masteredIds.size}</p>
              <p className="text-xs text-muted-foreground">已掌握</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-500">{learningIds.size}</p>
              <p className="text-xs text-muted-foreground">学习中</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={handleRestart}>
              <RotateCcw className="w-4 h-4 mr-2" />
              再学一遍
            </Button>
            <Button onClick={onClose}>完成</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶部进度条 */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {cards.length}
          </span>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 词卡区域 */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div
          className="w-full max-w-sm cursor-pointer"
          style={{ perspective: '1000px' }}
          onClick={handleFlip}
        >
          <div
            className="relative w-full min-h-[300px] transition-transform duration-500"
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* 正面 */}
            <Card
              className="absolute inset-0 flex flex-col"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
            >
              <CardContent className="flex flex-col items-center justify-center flex-1 p-6 relative">
                {/* 状态标签 */}
                {currentCard.status && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'absolute top-3 right-3',
                      currentCard.status === 'mastered' &&
                        'bg-green-500/10 text-green-500 border-green-500/20',
                      currentCard.status === 'learning' &&
                        'bg-amber-500/10 text-amber-500 border-amber-500/20',
                      currentCard.status === 'new' &&
                        'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    )}
                  >
                    {currentCard.status === 'mastered' && '已掌握'}
                    {currentCard.status === 'learning' && '学习中'}
                    {currentCard.status === 'new' && '新词'}
                  </Badge>
                )}
                <div className="text-center">
                  <p className="text-4xl font-bold mb-3">{currentCard.word}</p>
                  {currentCard.reading && (
                    <p className="text-xl text-muted-foreground">{currentCard.reading}</p>
                  )}
                  {/* 发音按钮 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'mt-4',
                      isSpeaking && 'text-primary'
                    )}
                    onClick={handleSpeak}
                  >
                    {isSpeaking ? (
                      <Loader2 className="w-5 h-5 mr-1.5 animate-spin" />
                    ) : (
                      <Volume2 className="w-5 h-5 mr-1.5" />
                    )}
                    {isSpeaking ? '播放中...' : '播放发音'}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-4">点击翻转查看释义</p>
                </div>
              </CardContent>
            </Card>

            {/* 背面 */}
            <Card
              className="absolute inset-0 flex flex-col"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <CardContent className="flex flex-col items-center justify-center flex-1 p-6 relative">
                {/* 状态标签 */}
                {currentCard.status && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'absolute top-3 right-3',
                      currentCard.status === 'mastered' &&
                        'bg-green-500/10 text-green-500 border-green-500/20',
                      currentCard.status === 'learning' &&
                        'bg-amber-500/10 text-amber-500 border-amber-500/20',
                      currentCard.status === 'new' &&
                        'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    )}
                  >
                    {currentCard.status === 'mastered' && '已掌握'}
                    {currentCard.status === 'learning' && '学习中'}
                    {currentCard.status === 'new' && '新词'}
                  </Badge>
                )}
                <div className="text-center space-y-4 w-full">
                  <div className="flex flex-col items-center">
                    <p className="text-2xl font-bold">{currentCard.word}</p>
                    {currentCard.reading && (
                      <p className="text-lg text-muted-foreground">{currentCard.reading}</p>
                    )}
                    {/* 发音按钮（背面） */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'mt-2',
                        isSpeaking && 'text-primary'
                      )}
                      onClick={handleSpeak}
                    >
                      {isSpeaking ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Volume2 className="w-4 h-4 mr-1" />
                      )}
                      发音
                    </Button>
                  </div>

                  {currentCard.partOfSpeech && (
                    <Badge variant="secondary">
                      {partOfSpeechLabels[currentCard.partOfSpeech] || currentCard.partOfSpeech}
                    </Badge>
                  )}

                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground mb-1">释义</p>
                    <p className="text-lg">{currentCard.meaning}</p>
                  </div>

                  {(currentCard.exampleSentence || currentCard.contentJa) && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">例句</p>
                      <p className="text-base leading-relaxed">
                        {currentCard.contentJa ? (
                          <TextWithFurigana
                            text={currentCard.contentJa}
                            furigana={parseFurigana(currentCard.furigana)}
                          />
                        ) : (
                          currentCard.exampleSentence
                        )}
                      </p>
                      {(currentCard.exampleTranslation || currentCard.contentZh) && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {currentCard.exampleTranslation || currentCard.contentZh}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 底部操作区 */}
      <div className="px-4 py-4 border-t bg-background">
        {isFlipped ? (
          // 翻转后显示掌握程度按钮
          <div className="space-y-3">
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12 border-amber-500/50 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                onClick={handleMarkLearning}
              >
                <BookOpen className="w-5 h-5 mr-2" />
                还在学
              </Button>
              <Button
                className="flex-1 h-12 bg-green-500 hover:bg-green-600"
                onClick={handleMarkMastered}
              >
                <Check className="w-5 h-5 mr-2" />
                已掌握
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              选择后自动进入下一张
            </p>
          </div>
        ) : (
          // 翻转前显示导航按钮
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>

            <Button onClick={handleFlip}>点击翻转</Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              disabled={currentIndex === cards.length - 1}
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>
        )}
      </div>

      {/* 退出确认对话框 */}
      {showExitConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowExitConfirm(false)}
        >
          <div
            className="bg-background rounded-lg max-w-sm w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-center">确认退出?</h3>
            <p className="text-sm text-muted-foreground text-center">
              你已学习了 {currentIndex + 1} 张词卡，进度会被保存。
            </p>
            <div className="flex items-center justify-center gap-4 py-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">{masteredIds.size}</p>
                <p className="text-xs text-muted-foreground">已掌握</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-500">{learningIds.size}</p>
                <p className="text-xs text-muted-foreground">学习中</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowExitConfirm(false)}
              >
                继续学习
              </Button>
              <Button
                variant="default"
                className="flex-1"
                onClick={handleConfirmExit}
              >
                保存退出
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
