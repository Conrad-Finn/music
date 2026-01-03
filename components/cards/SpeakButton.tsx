'use client'

import { useState, useCallback } from 'react'
import { Volume2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { speakJapanese, stopSpeaking } from '@/lib/utils/tts'
import { cn } from '@/lib/utils'

interface SpeakButtonProps {
  text: string
  className?: string
  size?: 'sm' | 'default' | 'lg'
  variant?: 'ghost' | 'outline' | 'default'
}

export function SpeakButton({
  text,
  className,
  size = 'default',
  variant = 'ghost',
}: SpeakButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false)

  const handleSpeak = useCallback(async () => {
    if (isSpeaking) {
      stopSpeaking()
      setIsSpeaking(false)
      return
    }

    try {
      setIsSpeaking(true)
      await speakJapanese(text)
    } catch (error) {
      console.error('发音失败:', error)
    } finally {
      setIsSpeaking(false)
    }
  }, [text, isSpeaking])

  return (
    <Button
      type="button"
      variant={variant}
      size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'}
      className={cn(
        'flex items-center gap-1.5',
        isSpeaking && 'text-primary',
        className
      )}
      onClick={handleSpeak}
      aria-label={isSpeaking ? '停止发音' : '播放发音'}
    >
      {isSpeaking ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
      <span className="sr-only md:not-sr-only md:inline">
        {isSpeaking ? '播放中...' : '发音'}
      </span>
    </Button>
  )
}
