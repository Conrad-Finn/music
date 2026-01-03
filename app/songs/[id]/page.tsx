'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ProgressCard } from '@/components/progress'
import { PlayerControls } from '@/components/player/PlayerControls'
import { ProgressBar } from '@/components/player/ProgressBar'
import { usePlayerStore } from '@/lib/stores/player-store'
import { useCardStore } from '@/lib/stores/card-store'
import { useSongStore } from '@/lib/stores/song-store'
import { cn } from '@/lib/utils'
import { GraduationCap, Music, Heart, Focus, X, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface FuriganaItem {
  word: string
  reading: string
  start: number
  end: number
}

interface Line {
  id: string
  lineNumber: number
  contentJa: string
  contentZh: string | null
  furigana: FuriganaItem[] | string | null
  startTime: number | null
  endTime: number | null
}

interface Song {
  id: string
  title: string
  artist: string | null
  duration: number | null
  coverUrl: string | null
  lines: Line[]
}

interface CardStats {
  total: number
  mastered: number
  learning: number
  new: number
}

// 解析 furigana 数据
function parseFurigana(furigana: FuriganaItem[] | string | null): FuriganaItem[] {
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

// 渲染带注音的歌词
function LyricLineItem({
  line,
  isCurrent,
  showTranslation,
  lineRef,
  isFavorited,
  onFavorite,
}: {
  line: Line
  isCurrent: boolean
  showTranslation: boolean
  lineRef?: React.RefObject<HTMLDivElement | null>
  isFavorited: boolean
  onFavorite: (lineId: string) => void
}) {
  const furiganaItems = parseFurigana(line.furigana)
  const [isAnimating, setIsAnimating] = useState(false)

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation()
    // 收藏时触发动画
    if (!isFavorited) {
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 300)
    }
    onFavorite(line.id)
  }

  // 简单实现：直接显示原文，用 ruby 标签添加注音
  const renderWithFurigana = () => {
    if (furiganaItems.length === 0) {
      return <span>{line.contentJa}</span>
    }

    // 按位置排序
    const sortedItems = [...furiganaItems].sort((a, b) => a.start - b.start)
    const result: React.ReactNode[] = []
    let lastEnd = 0

    sortedItems.forEach((item, index) => {
      // 添加注音前的普通文本
      if (item.start > lastEnd) {
        result.push(
          <span key={`text-${index}`}>
            {line.contentJa.slice(lastEnd, item.start)}
          </span>
        )
      }

      // 添加带注音的文本
      const actualWord = line.contentJa.slice(item.start, item.end)
      // 只有当读音和原词不同时才显示注音
      if (item.reading && item.reading !== actualWord) {
        result.push(
          <ruby key={`ruby-${index}`} className="ruby-annotation">
            {actualWord}
            <rp>(</rp>
            <rt className="text-xs text-muted-foreground">{item.reading}</rt>
            <rp>)</rp>
          </ruby>
        )
      } else {
        result.push(<span key={`word-${index}`}>{actualWord}</span>)
      }

      lastEnd = item.end
    })

    // 添加剩余文本
    if (lastEnd < line.contentJa.length) {
      result.push(
        <span key="text-end">{line.contentJa.slice(lastEnd)}</span>
      )
    }

    return <>{result}</>
  }

  return (
    <div
      ref={lineRef}
      className={cn(
        'group relative py-3 border-b border-border/50 last:border-0 transition-all duration-300',
        isCurrent && 'bg-primary/10 -mx-4 px-4 rounded-lg border-transparent'
      )}
    >
      <p
        className={cn(
          'text-lg leading-relaxed tracking-wide transition-all duration-300 pr-10',
          isCurrent && 'font-semibold text-primary scale-105 origin-left'
        )}
      >
        {renderWithFurigana()}
      </p>
      {showTranslation && line.contentZh && (
        <p
          className={cn(
            'text-sm text-muted-foreground mt-1 transition-all duration-300 pr-10',
            isCurrent && 'text-foreground/70'
          )}
        >
          {line.contentZh}
        </p>
      )}
      {/* 收藏按钮 */}
      <button
        type="button"
        onClick={handleFavorite}
        className={cn(
          'absolute right-0 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all duration-200',
          'hover:bg-rose-100 dark:hover:bg-rose-900/30',
          'focus:outline-none focus:ring-2 focus:ring-rose-500/20',
          isFavorited ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
        aria-label={isFavorited ? '取消收藏' : '收藏这句'}
      >
        <Heart
          className={cn(
            'w-5 h-5 transition-all duration-200',
            isFavorited
              ? 'fill-rose-500 text-rose-500'
              : 'text-muted-foreground hover:text-rose-500',
            isAnimating && 'scale-125'
          )}
        />
      </button>
    </div>
  )
}

export default function SongDetailPage() {
  const params = useParams()
  const router = useRouter()
  const songId = params.id as string

  const [song, setSong] = useState<Song | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showTranslation, setShowTranslation] = useState(true)
  const [showFurigana, setShowFurigana] = useState(true)
  const [cardStats, setCardStats] = useState<CardStats>({ total: 0, mastered: 0, learning: 0, new: 0 })
  const [focusMode, setFocusMode] = useState(false)  // 专注模式
  const [confirmDelete, setConfirmDelete] = useState(false)  // 删除确认
  const [deleting, setDeleting] = useState(false)  // 删除中
  const currentLineRef = React.useRef<HTMLDivElement>(null)

  // Player store
  const {
    currentSong: playerSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    repeatMode,
    playSong,
    togglePlay,
    seek,
    setVolume,
    toggleRepeatMode,
    playNext,
    playPrevious,
    hasNext,
    hasPrevious,
  } = usePlayerStore()

  // Card store - 收藏功能
  const { toggleFavoriteLine, getFavoritedLineIds } = useCardStore()
  const favoritedLineIds = getFavoritedLineIds()

  // Song store - 获取 MOCK 歌曲数据
  const { getSongById: getMockSongById, songs: allSongs } = useSongStore()
  const { setPlaylist } = usePlayerStore()

  // 处理收藏
  const handleFavorite = (lineId: string) => {
    const isFavorited = toggleFavoriteLine(lineId)
    if (isFavorited) {
      toast.success('已收藏', { duration: 1500 })
    } else {
      toast('已取消收藏', { duration: 1500 })
    }
  }

  // 删除歌曲
  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(`/api/songs/${songId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('歌曲已删除')
        router.push('/')
      } else {
        const data = await res.json()
        toast.error(data.error || '删除失败')
      }
    } catch {
      toast.error('删除失败')
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  // 是否正在播放当前歌曲
  const isCurrentSong = playerSong?.id === songId

  // 计算当前播放的歌词行索引
  const currentLineIndex = useMemo(() => {
    if (!song?.lines.length || !isCurrentSong) return -1
    const sortedLines = [...song.lines].sort((a, b) => a.lineNumber - b.lineNumber)
    return sortedLines.findIndex(
      (line) =>
        line.startTime !== null &&
        line.endTime !== null &&
        currentTime * 1000 >= line.startTime &&
        currentTime * 1000 < line.endTime
    )
  }, [song?.lines, currentTime, isCurrentSong])

  // 自动滚动到当前行
  useEffect(() => {
    if (currentLineIndex >= 0 && currentLineRef.current) {
      currentLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [currentLineIndex])

  // ESC 键退出专注模式
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusMode) {
        setFocusMode(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusMode])

  // 监听切歌：当 playerSong 变化且不是当前页面的歌曲时，跳转到新歌曲页面
  useEffect(() => {
    if (playerSong && playerSong.id !== songId) {
      router.push(`/songs/${playerSong.id}`)
    }
  }, [playerSong, songId, router])

  useEffect(() => {
    async function fetchSong() {
      // 判断是否是 Mock ID（格式为 song-1, song-2 等）
      const isMockId = /^song-\d+$/.test(songId)

      // 如果是 Mock ID，优先使用 Mock 数据
      if (isMockId) {
        const mockSong = getMockSongById(songId)
        if (mockSong) {
          // 转换 MOCK_SONGS 格式为页面所需格式
          const convertedSong: Song = {
            id: mockSong.id,
            title: mockSong.title,
            artist: mockSong.artist,
            duration: mockSong.duration,
            coverUrl: mockSong.coverUrl,
            lines: mockSong.lines.map((line, index) => ({
              id: line.id,
              lineNumber: index + 1,
              contentJa: line.contentJa,
              contentZh: line.contentZh,
              furigana: line.furigana || null,
              startTime: line.startTime ? line.startTime * 1000 : null,
              endTime: line.endTime ? line.endTime * 1000 : null,
            })),
          }
          setSong(convertedSong)
          // 确保播放列表已设置
          setPlaylist(allSongs)
          setLoading(false)
          return
        }
      }

      // 对于真实 UUID，从 API 获取数据库歌曲
      try {
        const res = await fetch(`/api/songs/${songId}`)
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || '获取歌曲失败')
          return
        }

        setSong(data.data)
      } catch (err) {
        setError('网络错误')
      } finally {
        setLoading(false)
      }
    }

    async function fetchCardStats() {
      try {
        const res = await fetch(`/api/songs/${songId}/cards`)
        const data = await res.json()

        if (res.ok && data.data) {
          const cards = data.data
          const stats: CardStats = {
            total: cards.length,
            mastered: 0,
            learning: 0,
            new: cards.length,
          }
          // 如果有进度数据，统计各状态数量
          cards.forEach((card: { progress?: { status: string } }) => {
            if (card.progress?.status === 'mastered') {
              stats.mastered++
              stats.new--
            } else if (card.progress?.status === 'learning') {
              stats.learning++
              stats.new--
            }
          })
          setCardStats(stats)
        }
      } catch (err) {
        // 忽略错误，不影响主流程
      }
    }

    if (songId) {
      fetchSong()
      fetchCardStats()
    }
  }, [songId, getMockSongById, allSongs, setPlaylist])

  if (loading) {
    return (
      <AppShell>
        <Header title="加载中..." showBack showHome />
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </AppShell>
    )
  }

  if (error || !song) {
    return (
      <AppShell>
        <Header title="错误" showBack showHome />
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground">{error || '歌曲未找到'}</p>
          <Button className="mt-4" onClick={() => router.push('/songs')}>
            返回歌曲列表
          </Button>
        </div>
      </AppShell>
    )
  }

  // 专注模式 UI
  if (focusMode && song) {
    return (
      <div
        className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col"
        onClick={() => setFocusMode(false)}
      >
        {/* 顶部关闭按钮 */}
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setFocusMode(false)}
            className="rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 歌词区域（可滚动） */}
        <div
          className="flex-1 overflow-y-auto px-8 py-12"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center max-w-2xl w-full mx-auto">
            {song.lines
              .sort((a, b) => a.lineNumber - b.lineNumber)
              .map((line, index) => {
                const isCurrent = isCurrentSong && index === currentLineIndex
                return (
                  <div
                    key={line.id}
                    ref={isCurrent ? currentLineRef : undefined}
                    className={cn(
                      'py-4 transition-all duration-300',
                      isCurrent
                        ? 'opacity-100 scale-110'
                        : 'opacity-30 scale-100 hover:opacity-60'
                    )}
                  >
                    <p
                      className={cn(
                        'text-2xl md:text-3xl leading-relaxed transition-all duration-300',
                        isCurrent && 'font-semibold text-primary'
                      )}
                    >
                      {line.contentJa}
                    </p>
                    {showTranslation && line.contentZh && (
                      <p
                        className={cn(
                          'text-lg text-muted-foreground mt-2 transition-all duration-300',
                          isCurrent && 'text-foreground/80'
                        )}
                      >
                        {line.contentZh}
                      </p>
                    )}
                  </div>
                )
              })}
          </div>
        </div>

        {/* 底部播放控制（简化版） */}
        <div
          className="px-6 py-4 bg-background/80 border-t"
          onClick={(e) => e.stopPropagation()}
        >
          <ProgressBar
            currentTime={isCurrentSong ? currentTime : 0}
            duration={isCurrentSong ? duration : song.duration || 0}
            onSeek={(time) => {
              if (isCurrentSong) {
                seek(time)
              }
            }}
            showTime={true}
          />
          <div className="flex items-center justify-center mt-3">
            <PlayerControls
              isPlaying={isCurrentSong && isPlaying}
              volume={volume}
              onPlayPause={() => {
                if (!isCurrentSong && song) {
                  playSong({
                    id: song.id,
                    title: song.title,
                    artist: song.artist || '',
                    coverUrl: song.coverUrl || '',
                    duration: song.duration || 0,
                    lines: song.lines.map((l) => ({
                      id: l.id,
                      contentJa: l.contentJa,
                      contentZh: l.contentZh || '',
                      startTime: (l.startTime || 0) / 1000,
                      endTime: (l.endTime || 0) / 1000,
                    })),
                    isFavorite: false,
                    createdAt: '',
                  })
                } else {
                  togglePlay()
                }
              }}
              onVolumeChange={setVolume}
              onPrevious={hasPrevious() ? playPrevious : undefined}
              onNext={hasNext() ? playNext : undefined}
              repeatMode={repeatMode}
              onRepeatModeChange={toggleRepeatMode}
              size="lg"
              showVolume={false}
            />
          </div>
          <p className="text-xs text-center text-muted-foreground mt-3">
            点击任意空白区域或按 ESC 退出专注模式
          </p>
        </div>
      </div>
    )
  }

  return (
    <AppShell showPlayer={false}>
      <Header title={song.title} showBack showHome />

      {/* 歌曲信息 */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex items-start gap-4">
          {/* 封面 */}
          <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
            {song.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={song.coverUrl}
                alt={song.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <Music className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{song.title}</h1>
            {song.artist && (
              <p className="text-sm text-muted-foreground">{song.artist}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {song.lines.length} 句歌词
            </p>
          </div>
          {/* 删除按钮 */}
          <Button
            variant={confirmDelete ? 'destructive' : 'ghost'}
            size="icon"
            onClick={handleDelete}
            disabled={deleting}
            className="flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        {confirmDelete && (
          <div className="mt-2 flex items-center justify-end gap-2 text-sm">
            <span className="text-destructive">确认删除?</span>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
              取消
            </Button>
            <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? '删除中...' : '确认'}
            </Button>
          </div>
        )}
      </div>

      {/* 学习进度卡片 */}
      {cardStats.total > 0 && (
        <div className="px-4 py-3 border-b">
          <ProgressCard
            songTitle={song.title}
            masteredCount={cardStats.mastered}
            learningCount={cardStats.learning}
            totalCount={cardStats.total}
          />
        </div>
      )}

      {/* 显示选项 */}
      <div className="flex gap-2 px-4 py-2 border-b">
        <Button
          size="sm"
          variant={showTranslation ? 'default' : 'outline'}
          onClick={() => setShowTranslation(!showTranslation)}
        >
          翻译
        </Button>
        <Button
          size="sm"
          variant={showFurigana ? 'default' : 'outline'}
          onClick={() => setShowFurigana(!showFurigana)}
        >
          注音
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setFocusMode(true)}
        >
          <Focus className="w-4 h-4 mr-1" />
          专注
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push(`/songs/${songId}/cards`)}
        >
          查看词卡
        </Button>
      </div>

      {/* 歌词列表 */}
      <ScrollArea className="h-[calc(100vh-56px-140px-48px-120px-80px)]">
        <div className={cn('px-4 py-2', !showFurigana && 'furigana-hidden')}>
          {song.lines
            .sort((a, b) => a.lineNumber - b.lineNumber)
            .map((line, index) => (
              <LyricLineItem
                key={line.id}
                line={line}
                isCurrent={isCurrentSong && index === currentLineIndex}
                showTranslation={showTranslation}
                lineRef={index === currentLineIndex ? currentLineRef : undefined}
                isFavorited={favoritedLineIds.has(line.id)}
                onFavorite={handleFavorite}
              />
            ))}
          {/* 底部留白 */}
          <div className="h-32" />
        </div>
      </ScrollArea>

      {/* 底部播放器控制 */}
      <div className="fixed bottom-14 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t px-4 py-3 md:bottom-0">
        {/* 进度条 */}
        <ProgressBar
          currentTime={isCurrentSong ? currentTime : 0}
          duration={isCurrentSong ? duration : song.duration || 0}
          onSeek={(time) => {
            if (isCurrentSong) {
              seek(time)
            }
          }}
          showTime={true}
        />
        {/* 播放控制 */}
        <div className="flex items-center justify-center mt-2">
          <PlayerControls
            isPlaying={isCurrentSong && isPlaying}
            volume={volume}
            onPlayPause={() => {
              if (!isCurrentSong && song) {
                // 将当前歌曲数据转换为播放器需要的格式
                playSong({
                  id: song.id,
                  title: song.title,
                  artist: song.artist || '',
                  coverUrl: song.coverUrl || '',
                  duration: song.duration || 0,
                  lines: song.lines.map((l) => ({
                    id: l.id,
                    contentJa: l.contentJa,
                    contentZh: l.contentZh || '',
                    startTime: (l.startTime || 0) / 1000,
                    endTime: (l.endTime || 0) / 1000,
                  })),
                  isFavorite: false,
                  createdAt: '',
                })
              } else {
                togglePlay()
              }
            }}
            onPrevious={hasPrevious() ? playPrevious : undefined}
            onNext={hasNext() ? playNext : undefined}
            onVolumeChange={setVolume}
            repeatMode={repeatMode}
            onRepeatModeChange={toggleRepeatMode}
            size="lg"
            showVolume={true}
          />
        </div>
      </div>

      <style jsx global>{`
        .furigana-hidden ruby rt {
          display: none;
        }
        .ruby-annotation {
          ruby-position: over;
        }
      `}</style>
    </AppShell>
  )
}
