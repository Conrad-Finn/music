import type { Line, Card } from '@/types'

// Mock 词汇库
const MOCK_WORDS = [
  { word: '夢', reading: 'ゆめ', meaning: '梦，梦想', partOfSpeech: 'noun' as const },
  { word: '渚', reading: 'なぎさ', meaning: '海滩，水边', partOfSpeech: 'noun' as const },
  { word: '花火', reading: 'はなび', meaning: '烟花，焰火', partOfSpeech: 'noun' as const },
  { word: '夜', reading: 'よる', meaning: '夜晚', partOfSpeech: 'noun' as const },
  { word: '君', reading: 'きみ', meaning: '你（亲密称呼）', partOfSpeech: 'noun' as const },
  { word: '愛', reading: 'あい', meaning: '爱', partOfSpeech: 'noun' as const },
  { word: '心', reading: 'こころ', meaning: '心', partOfSpeech: 'noun' as const },
  { word: '空', reading: 'そら', meaning: '天空', partOfSpeech: 'noun' as const },
  { word: '見る', reading: 'みる', meaning: '看', partOfSpeech: 'verb' as const },
  { word: '走る', reading: 'はしる', meaning: '跑', partOfSpeech: 'verb' as const },
]

// Mock 延迟配置
export const MOCK_CONFIG = {
  enabled: true,
  aiResponseDelay: { min: 500, max: 1500 },
  streamCharDelay: { min: 20, max: 50 },
}

// 随机延迟
function randomDelay(min: number, max: number): Promise<void> {
  return new Promise((r) => setTimeout(r, min + Math.random() * (max - min)))
}

// 词卡生成 Mock
export async function generateMockCard(
  line: Line
): Promise<Omit<Card, 'id' | 'status' | 'createdAt' | 'updatedAt'>> {
  // 模拟 AI 处理延迟
  await randomDelay(MOCK_CONFIG.aiResponseDelay.min, MOCK_CONFIG.aiResponseDelay.max)

  // 随机选择一个词汇
  const randomWord = MOCK_WORDS[Math.floor(Math.random() * MOCK_WORDS.length)]

  return {
    word: randomWord.word,
    reading: randomWord.reading,
    meaning: randomWord.meaning,
    partOfSpeech: randomWord.partOfSpeech,
    exampleSentence: line.contentJa,
    lineId: line.id,
    songId: line.songId || 'song-1',
  }
}

// 流式词卡生成（模拟 AI SDK 流式响应）
export async function* streamMockCardGeneration(line: Line) {
  const card = await generateMockCard(line)

  yield { type: 'word', value: card.word }
  await randomDelay(150, 300)

  yield { type: 'reading', value: card.reading }
  await randomDelay(150, 300)

  yield { type: 'meaning', value: card.meaning }
  await randomDelay(150, 300)

  yield { type: 'complete', value: card }
}

// Mock 歌词解析（未来可替换为真实 AI 调用）
export async function parseMockLyrics(rawContent: string): Promise<Line[]> {
  await randomDelay(1000, 2000)

  // 简单的行分割
  const lines = rawContent.split('\n').filter((l) => l.trim())

  return lines.map((content, index) => ({
    id: `line-mock-${index}`,
    contentJa: content,
    contentZh: `（翻译第 ${index + 1} 行）`,
    startTime: index * 5,
    endTime: (index + 1) * 5,
  }))
}
