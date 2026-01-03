/**
 * Mock 数据 - 听日文歌项目测试
 *
 * 基于 db/schema.ts 定义的实体创建测试数据
 * 包含: songs, lines, cards, favorites, conversations, messages
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Song,
  Line,
  Card,
  Favorite,
  Conversation,
  Message,
  UserProfile,
  CardProgress,
  Session,
} from '@/db/schema';

// ============================================================================
// 固定 UUID 用于测试一致性
// ============================================================================

export const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
export const TEST_USER_ID_2 = '00000000-0000-0000-0000-000000000002';
export const TEST_SONG_ID = '00000000-0000-0000-0000-000000000010';
export const TEST_SONG_ID_2 = '00000000-0000-0000-0000-000000000011';
export const TEST_LINE_ID = '00000000-0000-0000-0000-000000000020';
export const TEST_LINE_ID_2 = '00000000-0000-0000-0000-000000000021';
export const TEST_CARD_ID = '00000000-0000-0000-0000-000000000030';
export const TEST_CONVERSATION_ID = '00000000-0000-0000-0000-000000000040';
export const TEST_MESSAGE_ID = '00000000-0000-0000-0000-000000000050';

// ============================================================================
// Mock Songs (歌曲)
// ============================================================================

export const mockSongs: Song[] = [
  {
    id: TEST_SONG_ID,
    title: '夜に駆ける',
    artist: 'YOASOBI',
    duration: 258,
    coverUrl: 'https://example.com/covers/yoasobi-yoru.jpg',
    source: 'platform',
    sourceRef: 'spotify:track:123456',
    creatorId: null,
    isPublic: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
  {
    id: TEST_SONG_ID_2,
    title: 'Lemon',
    artist: '米津玄師',
    duration: 256,
    coverUrl: 'https://example.com/covers/kenshi-lemon.jpg',
    source: 'platform',
    sourceRef: 'spotify:track:789012',
    creatorId: null,
    isPublic: true,
    createdAt: new Date('2024-01-02T00:00:00Z'),
    updatedAt: new Date('2024-01-02T00:00:00Z'),
  },
];

// ============================================================================
// Mock Lines (歌词句子)
// ============================================================================

export const mockLines: Line[] = [
  {
    id: TEST_LINE_ID,
    songId: TEST_SONG_ID,
    lineNumber: 1,
    contentJa: '沈むように溶けてゆくように',
    contentZh: '仿佛沉沦 仿佛融化',
    furigana: [
      { word: '沈む', reading: 'しずむ', start: 0, end: 2 },
      { word: '溶けて', reading: 'とけて', start: 6, end: 9 },
    ],
    startTime: 0,
    endTime: 5000,
    createdAt: new Date('2024-01-01T00:00:00Z'),
  },
  {
    id: TEST_LINE_ID_2,
    songId: TEST_SONG_ID,
    lineNumber: 2,
    contentJa: '二人だけの空が広がる夜に',
    contentZh: '在只属于我们二人的天空蔓延的夜晚',
    furigana: [
      { word: '二人', reading: 'ふたり', start: 0, end: 2 },
      { word: '空', reading: 'そら', start: 5, end: 6 },
      { word: '広がる', reading: 'ひろがる', start: 7, end: 10 },
      { word: '夜', reading: 'よる', start: 10, end: 11 },
    ],
    startTime: 5000,
    endTime: 10000,
    createdAt: new Date('2024-01-01T00:00:00Z'),
  },
];

// ============================================================================
// Mock Cards (学习卡片)
// ============================================================================

export const mockCards: Card[] = [
  {
    id: TEST_CARD_ID,
    lineId: TEST_LINE_ID,
    word: '沈む',
    reading: 'しずむ',
    meaning: '沉没，下沉',
    partOfSpeech: 'verb',
    exampleSentence: '船が沈む',
    exampleTranslation: '船沉没了',
    audioClipUrl: null,
    wordPosition: { start: 0, end: 2 },
    createdAt: new Date('2024-01-01T00:00:00Z'),
  },
];

// ============================================================================
// Mock Favorites (收藏)
// ============================================================================

export const mockFavorites: Favorite[] = [
  {
    id: uuidv4(),
    userId: TEST_USER_ID,
    lineId: TEST_LINE_ID,
    createdAt: new Date('2024-01-01T00:00:00Z'),
  },
];

// ============================================================================
// Mock Conversations (对话)
// ============================================================================

export const mockConversations: Conversation[] = [
  {
    id: TEST_CONVERSATION_ID,
    userId: TEST_USER_ID,
    title: '学习「夜に駆ける」歌词',
    summary: '讨论YOASOBI歌曲中的词汇和语法',
    songId: TEST_SONG_ID,
    metadata: {
      model: 'claude-3-sonnet',
      totalTokens: 1500,
      purpose: 'lyrics_parse',
    },
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
  {
    id: uuidv4(),
    userId: TEST_USER_ID,
    title: '日语语法问答',
    summary: '关于动词变形的问题',
    songId: null,
    metadata: {
      model: 'claude-3-sonnet',
      totalTokens: 800,
      purpose: 'chat',
    },
    createdAt: new Date('2024-01-02T00:00:00Z'),
    updatedAt: new Date('2024-01-02T00:00:00Z'),
  },
];

// ============================================================================
// Mock Messages (消息)
// ============================================================================

export const mockMessages: Message[] = [
  {
    id: TEST_MESSAGE_ID,
    conversationId: TEST_CONVERSATION_ID,
    role: 'user',
    content: '请解释「沈むように溶けてゆくように」这句歌词的意思',
    tokens: 50,
    metadata: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
  },
  {
    id: uuidv4(),
    conversationId: TEST_CONVERSATION_ID,
    role: 'assistant',
    content:
      '这句歌词的意思是"仿佛沉沦、仿佛融化"，表达了一种被情感淹没的感觉...',
    tokens: 200,
    metadata: {
      model: 'claude-3-sonnet',
      finishReason: 'stop',
    },
    createdAt: new Date('2024-01-01T00:01:00Z'),
  },
];

// ============================================================================
// Mock User Profiles (用户扩展信息)
// ============================================================================

export const mockUserProfiles: UserProfile[] = [
  {
    id: uuidv4(),
    userId: TEST_USER_ID,
    nickname: '日语学习者',
    preferences: {
      theme: 'dark',
      fontSize: 'medium',
      showFurigana: true,
      showTranslation: true,
    },
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
];

// ============================================================================
// Mock Card Progress (卡片学习进度)
// ============================================================================

export const mockCardProgress: CardProgress[] = [
  {
    id: uuidv4(),
    userId: TEST_USER_ID,
    cardId: TEST_CARD_ID,
    status: 'learning',
    lastReviewedAt: new Date('2024-01-01T00:00:00Z'),
    reviewCount: 3,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
];

// ============================================================================
// Mock Sessions (学习会话)
// ============================================================================

export const mockSessions: Session[] = [
  {
    id: uuidv4(),
    userId: TEST_USER_ID,
    songId: TEST_SONG_ID,
    mode: 'mixed',
    startedAt: new Date('2024-01-01T10:00:00Z'),
    endedAt: new Date('2024-01-01T10:30:00Z'),
    interactions: [
      { type: 'play', targetId: TEST_SONG_ID, timestamp: '2024-01-01T10:00:00Z' },
      { type: 'favorite', targetId: TEST_LINE_ID, timestamp: '2024-01-01T10:05:00Z' },
      { type: 'review', targetId: TEST_CARD_ID, timestamp: '2024-01-01T10:10:00Z' },
    ],
  },
];

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 生成新的 Conversation 数据
 */
export function createMockConversation(
  overrides: Partial<Conversation> = {}
): Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    userId: TEST_USER_ID,
    title: '测试对话',
    summary: null,
    songId: null,
    metadata: null,
    ...overrides,
  };
}

/**
 * 生成新的 Message 数据
 */
export function createMockMessage(
  conversationId: string,
  overrides: Partial<Message> = {}
): Omit<Message, 'id' | 'createdAt'> {
  return {
    conversationId,
    role: 'user',
    content: '测试消息内容',
    tokens: null,
    metadata: null,
    ...overrides,
  };
}

/**
 * 生成新的 Song 数据
 */
export function createMockSong(overrides: Partial<Song> = {}): Omit<Song, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    title: '测试歌曲',
    artist: '测试艺术家',
    duration: 180,
    coverUrl: null,
    source: 'platform',
    sourceRef: null,
    creatorId: null,
    isPublic: true,
    ...overrides,
  };
}

/**
 * 生成新的 Line 数据
 */
export function createMockLine(
  songId: string,
  overrides: Partial<Line> = {}
): Omit<Line, 'id' | 'createdAt'> {
  return {
    songId,
    lineNumber: 1,
    contentJa: 'テスト歌詞',
    contentZh: '测试歌词',
    furigana: null,
    startTime: 0,
    endTime: 5000,
    ...overrides,
  };
}

/**
 * 生成新的 Card 数据
 */
export function createMockCard(
  lineId: string,
  overrides: Partial<Card> = {}
): Omit<Card, 'id' | 'createdAt'> {
  return {
    lineId,
    word: 'テスト',
    reading: 'てすと',
    meaning: '测试',
    partOfSpeech: 'noun',
    exampleSentence: null,
    exampleTranslation: null,
    audioClipUrl: null,
    wordPosition: null,
    ...overrides,
  };
}
