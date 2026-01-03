// TTS (Text-to-Speech) 工具函数
// 使用 Web Speech API 实现日语发音

export interface TTSOptions {
  lang?: string
  rate?: number
  pitch?: number
  volume?: number
}

const defaultOptions: TTSOptions = {
  lang: 'ja-JP',
  rate: 0.9,
  pitch: 1,
  volume: 1,
}

/**
 * 播放日语文本的发音
 * @param text 要朗读的文本
 * @param options TTS 选项
 * @returns Promise<void> 播放完成后 resolve
 */
export function speakJapanese(
  text: string,
  options: TTSOptions = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('浏览器不支持语音合成'))
      return
    }

    // 停止当前正在播放的语音
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    const mergedOptions = { ...defaultOptions, ...options }

    utterance.lang = mergedOptions.lang || 'ja-JP'
    utterance.rate = mergedOptions.rate || 0.9
    utterance.pitch = mergedOptions.pitch || 1
    utterance.volume = mergedOptions.volume || 1

    // 尝试获取日语语音
    const voices = window.speechSynthesis.getVoices()
    const japaneseVoice = voices.find(
      (voice) => voice.lang.includes('ja') || voice.lang.includes('JP')
    )
    if (japaneseVoice) {
      utterance.voice = japaneseVoice
    }

    utterance.onend = () => resolve()
    utterance.onerror = (event) => {
      console.error('TTS Error:', event)
      reject(new Error('语音播放失败'))
    }

    window.speechSynthesis.speak(utterance)
  })
}

/**
 * 检查浏览器是否支持日语 TTS
 */
export function checkJapaneseTTSSupport(): boolean {
  if (!('speechSynthesis' in window)) {
    return false
  }

  const voices = window.speechSynthesis.getVoices()
  return voices.some(
    (voice) => voice.lang.includes('ja') || voice.lang.includes('JP')
  )
}

/**
 * 停止当前正在播放的语音
 */
export function stopSpeaking(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}
