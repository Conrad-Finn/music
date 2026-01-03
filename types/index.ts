// Furigana 注音项
export interface FuriganaItem {
  word: string
  reading: string
  start: number
  end: number
}

// 歌词行
export interface Line {
  id: string
  songId?: string
  contentJa: string
  contentZh: string
  furigana?: FuriganaItem[]
  startTime: number
  endTime: number
  position?: 'verse' | 'chorus' | 'bridge'
  emotion?: 'sweet' | 'sad' | 'hype' | 'nostalgic'
}

// 歌曲
export interface Song {
  id: string
  title: string
  artist: string
  album?: string
  coverUrl: string
  audioUrl?: string // 本地音频文件路径
  duration: number
  sourceType?: 'local' | 'platform'
  sourceRef?: string
  genre?: 'jpop' | 'anime' | 'drama' | 'emotional'
  difficulty?: 'easy' | 'medium' | 'hard'
  lines: Line[]
  isFavorite: boolean
  createdAt: string
}

// 词卡状态
export type CardStatus = 'new' | 'learning' | 'mastered'

// 词卡
export interface Card {
  id: string
  word: string
  reading: string
  meaning: string
  partOfSpeech?: 'noun' | 'verb' | 'adj' | 'other'
  exampleSentence: string
  lineId: string
  songId: string
  status: CardStatus
  createdAt: string
  updatedAt: string
}

// 播放模式
export type PlayMode = 'pure_listen' | 'learning' | 'mixed'

// 用户状态
export type UserStatus = 'guest' | 'registered' | 'premium'
