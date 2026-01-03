'use client'

import { useAudioPlayer } from '@/lib/hooks/useAudioPlayer'
import { usePlayerStore } from '@/lib/stores/player-store'
import { useEffect } from 'react'

// 全局音频播放器组件 - 管理 HTML5 Audio 元素
export function AudioProvider({ children }: { children: React.ReactNode }) {
  const { seek: audioSeek } = useAudioPlayer()
  const { seek: storeSeek } = usePlayerStore()

  // 同步 store 的 seek 函数到真实音频
  useEffect(() => {
    // 重写 store 的 seek 函数以同时控制音频
    const originalSeek = usePlayerStore.getState().seek
    usePlayerStore.setState({
      seek: (time: number) => {
        audioSeek(time)
      },
    })

    return () => {
      usePlayerStore.setState({ seek: originalSeek })
    }
  }, [audioSeek])

  return <>{children}</>
}
