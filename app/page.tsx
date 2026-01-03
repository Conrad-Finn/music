'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePlayerStore } from '@/lib/stores/player-store'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { SongListItem } from '@/components/songs/SongListItem'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronDown, ChevronUp, Plus, Music } from 'lucide-react'
import type { Song } from '@/types'

interface DbSong {
  id: string
  title: string
  artist: string | null
  duration: number | null
  coverUrl: string | null
  createdAt: string
}

interface CardStats {
  total: number
  new: number
  learning: number
  mastered: number
}

// 转换数据库歌曲为前端格式
function convertDbSong(dbSong: DbSong): Song {
  return {
    id: dbSong.id,
    title: dbSong.title,
    artist: dbSong.artist || '',
    coverUrl: dbSong.coverUrl || '',
    duration: dbSong.duration || 0,
    lines: [],
    isFavorite: false,
    createdAt: dbSong.createdAt,
  }
}

export default function HomePage() {
  const router = useRouter()
  const { currentSong, playSong, setPlaylist } = usePlayerStore()

  // 数据状态
  const [allSongs, setAllSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [cardStats, setCardStats] = useState<CardStats>({ total: 0, new: 0, learning: 0, mastered: 0 })

  // 折叠状态
  const [showAllRecent, setShowAllRecent] = useState(false)
  const [showAllFavorites, setShowAllFavorites] = useState(false)
  const [showAllSongs, setShowAllSongs] = useState(false)

  // 收藏状态（从 localStorage 读取）
  const [favoriteSongIds, setFavoriteSongIds] = useState<Set<string>>(new Set())

  // 最近播放（从 localStorage 读取）
  const [recentIds, setRecentIds] = useState<string[]>([])

  // 获取词卡统计
  const fetchCardStats = useCallback(async () => {
    try {
      const res = await fetch('/api/cards?limit=1')
      const data = await res.json()
      if (res.ok && data.stats) {
        setCardStats(data.stats)
      }
    } catch (err) {
      console.error('Failed to fetch card stats:', err)
    }
  }, [])

  // 加载数据
  useEffect(() => {
    async function fetchSongs() {
      try {
        const res = await fetch('/api/songs?limit=100')
        const data = await res.json()

        if (res.ok && data.data) {
          const songs = data.data.map(convertDbSong)
          setAllSongs(songs)
          setPlaylist(songs)
        }
      } catch (err) {
        console.error('Failed to fetch songs:', err)
      } finally {
        setLoading(false)
      }
    }

    // 从 localStorage 读取收藏和最近播放
    try {
      const stored = localStorage.getItem('song-storage')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.state?.songs) {
          const favIds = new Set(
            parsed.state.songs
              .filter((s: { isFavorite?: boolean }) => s.isFavorite)
              .map((s: { id: string }) => s.id)
          )
          setFavoriteSongIds(favIds)
        }
        if (parsed.state?.recentlyPlayed) {
          setRecentIds(parsed.state.recentlyPlayed)
        }
      }
    } catch (e) {
      console.error('Failed to load localStorage:', e)
    }

    fetchSongs()
    fetchCardStats()

    // 页面可见时刷新词卡统计
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchCardStats()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [setPlaylist, fetchCardStats])

  // 切换收藏
  const toggleFavorite = (songId: string) => {
    setFavoriteSongIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(songId)) {
        newSet.delete(songId)
      } else {
        newSet.add(songId)
      }

      // 保存到 localStorage
      try {
        const stored = localStorage.getItem('song-storage')
        const parsed = stored ? JSON.parse(stored) : { state: { songs: [], recentlyPlayed: [] } }
        parsed.state.songs = allSongs.map(s => ({
          id: s.id,
          isFavorite: newSet.has(s.id)
        }))
        localStorage.setItem('song-storage', JSON.stringify(parsed))
      } catch (e) {
        console.error('Failed to save favorites:', e)
      }

      return newSet
    })
  }

  // 播放歌曲
  const handlePlay = (song: Song) => {
    playSong(song)

    // 更新最近播放
    const newRecent = [song.id, ...recentIds.filter(id => id !== song.id)].slice(0, 10)
    setRecentIds(newRecent)

    // 保存到 localStorage
    try {
      const stored = localStorage.getItem('song-storage')
      const parsed = stored ? JSON.parse(stored) : { state: { songs: [], recentlyPlayed: [] } }
      parsed.state.recentlyPlayed = newRecent
      localStorage.setItem('song-storage', JSON.stringify(parsed))
    } catch (e) {
      console.error('Failed to save recent:', e)
    }

    router.push(`/songs/${song.id}`)
  }

  // 计算各列表
  const recentSongs = recentIds
    .map(id => allSongs.find(s => s.id === id))
    .filter((s): s is Song => s !== undefined)

  const favoriteSongs = allSongs.filter(s => favoriteSongIds.has(s.id))

  // 显示数量控制
  const displayedRecent = showAllRecent ? recentSongs : recentSongs.slice(0, 3)
  const displayedFavorites = showAllFavorites ? favoriteSongs : favoriteSongs.slice(0, 5)
  const displayedAll = showAllSongs ? allSongs : allSongs.slice(0, 7)

  if (loading) {
    return (
      <AppShell>
        <Header title="听日文歌" />
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <Header title="听日文歌" />

      <ScrollArea className="h-[calc(100vh-56px-120px)]">
        <div className="p-4 space-y-6">
          {/* 快捷操作 */}
          <section className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push('/songs/import')}
            >
              <Plus className="w-4 h-4 mr-2" />
              导入歌曲
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push('/cards')}
            >
              <Music className="w-4 h-4 mr-2" />
              词卡 ({cardStats.total})
            </Button>
          </section>

          {/* 学习统计 */}
          <section className="flex gap-3 overflow-x-auto pb-2">
            <div className="flex-shrink-0 bg-card rounded-lg p-3 min-w-[80px] text-center border">
              <p className="text-xl font-bold text-green-500">{cardStats.mastered}</p>
              <p className="text-xs text-muted-foreground">已掌握</p>
            </div>
            <div className="flex-shrink-0 bg-card rounded-lg p-3 min-w-[80px] text-center border">
              <p className="text-xl font-bold text-amber-500">{cardStats.learning}</p>
              <p className="text-xs text-muted-foreground">学习中</p>
            </div>
            <div className="flex-shrink-0 bg-card rounded-lg p-3 min-w-[80px] text-center border">
              <p className="text-xl font-bold text-blue-500">{cardStats.new}</p>
              <p className="text-xs text-muted-foreground">新词</p>
            </div>
          </section>

          {/* 最近播放 - 最多显示3首 */}
          {recentSongs.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold">最近播放</h2>
                {recentSongs.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllRecent(!showAllRecent)}
                  >
                    {showAllRecent ? (
                      <>收起 <ChevronUp className="w-4 h-4 ml-1" /></>
                    ) : (
                      <>更多 ({recentSongs.length}) <ChevronDown className="w-4 h-4 ml-1" /></>
                    )}
                  </Button>
                )}
              </div>
              <div className="space-y-1">
                {displayedRecent.map((song, index) => (
                  <SongListItem
                    key={song.id}
                    song={{ ...song, isFavorite: favoriteSongIds.has(song.id) }}
                    index={index}
                    isPlaying={currentSong?.id === song.id}
                    onPlay={() => handlePlay(song)}
                    onFavorite={() => toggleFavorite(song.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 收藏歌曲 - 最多显示5首 */}
          {favoriteSongs.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold">收藏歌曲</h2>
                {favoriteSongs.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllFavorites(!showAllFavorites)}
                  >
                    {showAllFavorites ? (
                      <>收起 <ChevronUp className="w-4 h-4 ml-1" /></>
                    ) : (
                      <>更多 ({favoriteSongs.length}) <ChevronDown className="w-4 h-4 ml-1" /></>
                    )}
                  </Button>
                )}
              </div>
              <div className="space-y-1">
                {displayedFavorites.map((song, index) => (
                  <SongListItem
                    key={song.id}
                    song={{ ...song, isFavorite: true }}
                    index={index}
                    isPlaying={currentSong?.id === song.id}
                    onPlay={() => handlePlay(song)}
                    onFavorite={() => toggleFavorite(song.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 全部歌曲 - 最多显示7首 */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">全部歌曲</h2>
              {allSongs.length > 7 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllSongs(!showAllSongs)}
                >
                  {showAllSongs ? (
                    <>收起 <ChevronUp className="w-4 h-4 ml-1" /></>
                  ) : (
                    <>更多 ({allSongs.length}) <ChevronDown className="w-4 h-4 ml-1" /></>
                  )}
                </Button>
              )}
            </div>
            {allSongs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>还没有歌曲</p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => router.push('/songs/import')}
                >
                  导入第一首歌
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {displayedAll.map((song, index) => (
                  <SongListItem
                    key={song.id}
                    song={{ ...song, isFavorite: favoriteSongIds.has(song.id) }}
                    index={index}
                    isPlaying={currentSong?.id === song.id}
                    onPlay={() => handlePlay(song)}
                    onFavorite={() => toggleFavorite(song.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* 底部留白 */}
          <div className="h-4" />
        </div>
      </ScrollArea>
    </AppShell>
  )
}
