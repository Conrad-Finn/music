'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Heart, ChevronRight } from 'lucide-react'
import { usePlayerStore } from '@/lib/stores/player-store'
import { MOCK_SONGS } from '@/data/mock/songs'
import type { Song } from '@/types'

interface DbSong {
  id: string
  title: string
  artist: string | null
  duration: number | null
  coverUrl: string | null
  source: string
  isPublic: boolean
  createdAt: string
}

type FilterType = 'all' | 'recent'

export default function SongsPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterType>('all')
  const [songs, setSongs] = useState<DbSong[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 播放器 store
  const { setPlaylist, playSong } = usePlayerStore()

  useEffect(() => {
    // 初始化播放列表（使用 MOCK_SONGS 用于测试）
    setPlaylist(MOCK_SONGS)
  }, [setPlaylist])

  useEffect(() => {
    async function fetchSongs() {
      try {
        const res = await fetch('/api/songs?limit=50')
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || '获取歌曲失败')
          return
        }

        setSongs(data.data)
      } catch (err) {
        setError('网络错误')
      } finally {
        setLoading(false)
      }
    }

    fetchSongs()
  }, [])

  const filteredSongs = (() => {
    switch (filter) {
      case 'recent':
        return [...songs].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      default:
        return songs
    }
  })()

  const handleSongClick = (song: DbSong) => {
    // 查找 MOCK_SONGS 中对应的歌曲并播放
    const mockSong = MOCK_SONGS.find(s => s.title === song.title || s.id === song.id)
    if (mockSong) {
      playSong(mockSong)
    }
    router.push(`/songs/${song.id}`)
  }

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'recent', label: '最近' },
  ]

  if (loading) {
    return (
      <AppShell>
        <Header title="歌曲" showHome />
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <Header title="歌曲" showHome />
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground">{error}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            重试
          </Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <Header title="歌曲" showHome />

      {/* 筛选标签 + 导入按钮 */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex gap-2 overflow-x-auto">
          {filters.map((f) => (
            <Button
              key={f.key}
              variant={filter === f.key ? 'default' : 'outline'}
              size="sm"
              className={cn('flex-shrink-0', filter === f.key && 'bg-primary')}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push('/songs/import')}
          className="flex-shrink-0 ml-2"
        >
          + 导入
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-56px-48px-120px)]">
        <div className="p-4">
          {filteredSongs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-4xl mb-4">🎵</span>
              <p className="text-muted-foreground">还没有导入歌曲</p>
              <Button
                className="mt-4"
                onClick={() => router.push('/songs/import')}
              >
                导入第一首歌
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSongs.map((song) => (
                <div
                  key={song.id}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg',
                    'hover:bg-muted/50 cursor-pointer transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20'
                  )}
                  onClick={() => handleSongClick(song)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSongClick(song)}
                >
                  {/* 封面 */}
                  <div className="w-12 h-12 rounded bg-muted flex-shrink-0 overflow-hidden">
                    {song.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={song.coverUrl}
                        alt={song.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xl">🎵</span>
                      </div>
                    )}
                  </div>

                  {/* 歌曲信息 */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{song.title}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {song.artist || '未知艺术家'}
                    </p>
                  </div>

                  {/* 箭头 */}
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </AppShell>
  )
}
