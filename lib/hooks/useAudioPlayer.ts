'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { usePlayerStore } from '@/lib/stores/player-store'
import { localAudioStorage } from '@/lib/storage'

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const animationRef = useRef<number | null>(null)
  const currentBlobUrlRef = useRef<string | null>(null)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)

  const {
    currentSong,
    isPlaying,
    volume,
    currentTime,
    repeatMode,
    setCurrentTime,
    setDuration,
    updateCurrentLineByTime,
    pause,
    play,
    playNext,
    hasNext,
  } = usePlayerStore()

  // 清理 Blob URL
  const cleanupBlobUrl = useCallback(() => {
    if (currentBlobUrlRef.current) {
      localAudioStorage.revokeUrl(currentBlobUrlRef.current)
      currentBlobUrlRef.current = null
    }
  }, [])

  // 初始化 Audio 元素
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.preload = 'metadata'
    }

    const audio = audioRef.current

    // 加载完成
    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      setIsLoadingAudio(false)
    }

    // 播放结束 - 根据循环模式处理
    const handleEnded = () => {
      if (repeatMode === 'one') {
        // 单曲循环：重新播放
        audio.currentTime = 0
        setCurrentTime(0)
        audio.play().catch(console.error)
      } else if (repeatMode === 'all' && hasNext()) {
        // 列表循环：播放下一首
        playNext()
      } else {
        // 停止播放
        pause()
        setCurrentTime(0)
      }
    }

    // 错误处理
    const handleError = (e: Event) => {
      console.error('Audio error:', e)
      setIsLoadingAudio(false)
      pause()
    }

    // 可以播放
    const handleCanPlay = () => {
      setIsLoadingAudio(false)
    }

    // 时间更新事件 - 备用更新机制
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      updateCurrentLineByTime(audio.currentTime)
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('timeupdate', handleTimeUpdate)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      cleanupBlobUrl()
    }
  }, [pause, setCurrentTime, setDuration, cleanupBlobUrl, updateCurrentLineByTime, repeatMode, playNext, hasNext])

  // 切换歌曲时加载音频（支持本地和远程）
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentSong) return

    const loadAudio = async () => {
      setIsLoadingAudio(true)
      cleanupBlobUrl()

      // 首先尝试从本地存储加载
      try {
        const localUrl = await localAudioStorage.getAudioUrl(currentSong.id)
        if (localUrl) {
          currentBlobUrlRef.current = localUrl
          audio.src = localUrl
          audio.load()

          if (isPlaying) {
            audio.play().catch(console.error)
          }
          return
        }
      } catch (err) {
        console.error('Failed to load local audio:', err)
      }

      // 如果没有本地音频，尝试使用远程 URL
      if (currentSong.audioUrl) {
        audio.src = currentSong.audioUrl
        audio.load()

        if (isPlaying) {
          audio.play().catch(console.error)
        }
      } else {
        setIsLoadingAudio(false)
      }
    }

    loadAudio()
  }, [currentSong?.id, cleanupBlobUrl])

  // 播放/暂停控制
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentSong) return

    // 检查是否有可用的音频源
    const hasAudioSource = audio.src && audio.src !== ''

    if (isPlaying && hasAudioSource) {
      audio.play().catch((e) => {
        console.error('Play failed:', e)
        pause()
      })
    } else {
      audio.pause()
    }
  }, [isPlaying, currentSong?.id, pause])

  // 音量控制
  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      audio.volume = volume
    }
  }, [volume])

  // 进度更新动画循环
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateProgress = () => {
      if (audio) {
        // 不管 audio 是否暂停，只要 isPlaying 状态为 true 就持续更新
        // 这样可以确保即使音频加载中也能正常工作
        if (!audio.paused) {
          setCurrentTime(audio.currentTime)
          updateCurrentLineByTime(audio.currentTime)
        }
        // 只要 isPlaying 就继续循环
        animationRef.current = requestAnimationFrame(updateProgress)
      }
    }

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateProgress)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, setCurrentTime, updateCurrentLineByTime])

  // 跳转到指定时间
  const seek = useCallback((time: number) => {
    const audio = audioRef.current
    if (audio && isFinite(time)) {
      audio.currentTime = time
      setCurrentTime(time)
      updateCurrentLineByTime(time)
    }
  }, [setCurrentTime, updateCurrentLineByTime])

  return {
    audioRef,
    seek,
    isLoadingAudio,
  }
}
