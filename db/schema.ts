/**
 * 数据库 Schema - 听日文歌项目
 *
 * 基于认知模型 (cog.md) 定义的实体：
 * - User (用户) - 使用 Neon Auth (neon_auth.user)
 * - Song (歌曲)
 * - Line (歌词句子)
 * - Card (学习卡片)
 * - Favorite (收藏关系)
 * - CardProgress (卡片学习进度)
 * - Session (学习会话)
 *
 * 约束遵循 (real.md)：
 * - C1: 音频版权合规 - 不存储完整音源，仅存储引用
 * - C2: 用户数据隔离 - 所有用户数据通过 userId 关联
 * - C3: 最小必要信息原则 - 用户扩展信息最小化
 */

import { sql, relations } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ============================================================================
// Better Auth 用户表引用（public schema）
// ============================================================================

/**
 * Better Auth 用户表引用
 * Better Auth 在 public schema 创建 user 表，使用 text 类型 ID
 */
const betterAuthUser = pgTable('user', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  emailVerified: boolean('email_verified'),
  name: text('name'),
  image: text('image'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

// 导出类型用于类型提示
export type BetterAuthUser = typeof betterAuthUser.$inferSelect;

// ============================================================================
// 枚举定义
// ============================================================================

/** 歌曲来源类型 */
export const songSourceEnum = pgEnum('song_source', ['local', 'platform']);

/** 卡片学习状态 */
export const cardStatusEnum = pgEnum('card_status', ['new', 'learning', 'mastered']);

/** 词性类型 */
export const partOfSpeechEnum = pgEnum('part_of_speech', [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'particle',
  'other',
]);

/** 会话模式 */
export const sessionModeEnum = pgEnum('session_mode', ['listen', 'learn', 'mixed']);

/** 对话角色 */
export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant', 'system']);

// ============================================================================
// 业务表定义
// ============================================================================

/**
 * 用户扩展信息表
 *
 * Neon Auth 管理核心用户信息（email, name, image）
 * 此表存储应用特定的扩展信息
 *
 * 约束 C3: 最小必要信息原则 - 仅存储必要的偏好设置
 */
export const userProfiles = pgTable(
  'user_profiles',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    // 关联 Neon Auth 用户 - Better Auth 使用 text ID
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => betterAuthUser.id, { onDelete: 'cascade' }),
    // 昵称（可选，用于展示）
    nickname: varchar('nickname', { length: 50 }),
    // 用户偏好设置（JSONB 存储灵活配置）
    preferences: jsonb('preferences').$type<{
      theme?: 'light' | 'dark' | 'system';
      fontSize?: 'small' | 'medium' | 'large';
      showFurigana?: boolean;
      showTranslation?: boolean;
    }>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('user_profiles_user_id_idx').on(table.userId)]
);

/**
 * 歌曲表
 *
 * 存储歌曲元数据，不存储完整音源
 * 约束 C1: 音频版权合规 - sourceRef 仅存储平台引用 ID
 */
export const songs = pgTable(
  'songs',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    // 歌曲标题
    title: varchar('title', { length: 200 }).notNull(),
    // 艺术家
    artist: varchar('artist', { length: 100 }),
    // 时长（秒）
    duration: integer('duration'),
    // 封面图 URL
    coverUrl: text('cover_url'),
    // 歌曲来源类型
    source: songSourceEnum('source').default('platform').notNull(),
    // 外部平台引用（如 Apple Music ID、Spotify ID）
    sourceRef: varchar('source_ref', { length: 255 }),
    // 创建者（导入本地歌曲的用户）- Better Auth 使用 text ID
    creatorId: text('creator_id').references(() => betterAuthUser.id, {
      onDelete: 'set null',
    }),
    // 是否公开（平台歌曲为 true，本地导入为 false）
    isPublic: boolean('is_public').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('songs_title_idx').on(table.title),
    index('songs_artist_idx').on(table.artist),
    index('songs_creator_id_idx').on(table.creatorId),
  ]
);

/**
 * 歌词句子表
 *
 * 存储歌曲的每一行歌词及其时间轴信息
 * 约束 C5: 歌词片段引用限制 - 每行独立存储，便于控制展示范围
 */
export const lines = pgTable(
  'lines',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    // 关联歌曲
    songId: uuid('song_id')
      .notNull()
      .references(() => songs.id, { onDelete: 'cascade' }),
    // 行号（用于排序）
    lineNumber: integer('line_number').notNull(),
    // 日文原文
    contentJa: text('content_ja').notNull(),
    // 中文翻译
    contentZh: text('content_zh'),
    // 假名注音（JSONB 存储分词后的假名）
    furigana: jsonb('furigana').$type<
      Array<{
        word: string;
        reading: string;
        start: number;
        end: number;
      }>
    >(),
    // 开始时间（毫秒）
    startTime: integer('start_time'),
    // 结束时间（毫秒）
    endTime: integer('end_time'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('lines_song_id_idx').on(table.songId),
    index('lines_song_line_idx').on(table.songId, table.lineNumber),
  ]
);

/**
 * 学习卡片表
 *
 * 存储从歌词句子中生成的词卡
 * 由 AI 生成，包含词义、例句等学习内容
 */
export const cards = pgTable(
  'cards',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    // 关联歌词句子
    lineId: uuid('line_id')
      .notNull()
      .references(() => lines.id, { onDelete: 'cascade' }),
    // 目标词汇
    word: varchar('word', { length: 100 }).notNull(),
    // 假名读音
    reading: varchar('reading', { length: 100 }),
    // 中文释义
    meaning: text('meaning').notNull(),
    // 词性
    partOfSpeech: partOfSpeechEnum('part_of_speech').default('other'),
    // 例句
    exampleSentence: text('example_sentence'),
    // 例句翻译
    exampleTranslation: text('example_translation'),
    // 发音音频片段 URL（可选，短切片）
    audioClipUrl: text('audio_clip_url'),
    // 目标词在原句中的位置（用于高亮）
    wordPosition: jsonb('word_position').$type<{
      start: number;
      end: number;
    }>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('cards_line_id_idx').on(table.lineId),
    index('cards_word_idx').on(table.word),
  ]
);

/**
 * 收藏表
 *
 * 记录用户收藏的歌词句子
 * 约束 C2: 用户数据隔离 - 收藏仅对该用户可见
 */
export const favorites = pgTable(
  'favorites',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    // 关联用户 - Better Auth 使用 text ID
    userId: text('user_id')
      .notNull()
      .references(() => betterAuthUser.id, { onDelete: 'cascade' }),
    // 关联歌词句子
    lineId: uuid('line_id')
      .notNull()
      .references(() => lines.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('favorites_user_id_idx').on(table.userId),
    index('favorites_line_id_idx').on(table.lineId),
    // 用户-句子唯一约束（防止重复收藏）
    uniqueIndex('favorites_user_line_idx').on(table.userId, table.lineId),
  ]
);

/**
 * 卡片学习进度表
 *
 * 记录用户对每张卡片的学习状态
 * 约束 C2: 用户数据隔离 - 学习进度仅对该用户可见
 */
export const cardProgress = pgTable(
  'card_progress',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    // 关联用户 - Better Auth 使用 text ID
    userId: text('user_id')
      .notNull()
      .references(() => betterAuthUser.id, { onDelete: 'cascade' }),
    // 关联卡片
    cardId: uuid('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    // 学习状态
    status: cardStatusEnum('status').default('new').notNull(),
    // 上次复习时间
    lastReviewedAt: timestamp('last_reviewed_at'),
    // 复习次数
    reviewCount: integer('review_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('card_progress_user_id_idx').on(table.userId),
    index('card_progress_card_id_idx').on(table.cardId),
    index('card_progress_status_idx').on(table.userId, table.status),
    // 用户-卡片唯一约束
    uniqueIndex('card_progress_user_card_idx').on(table.userId, table.cardId),
  ]
);

/**
 * 学习会话表
 *
 * 记录用户的学习会话
 * 约束 C7: 无压迫性学习反馈 - 仅记录必要信息，不用于压迫性统计
 */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    // 关联用户 - Better Auth 使用 text ID
    userId: text('user_id')
      .notNull()
      .references(() => betterAuthUser.id, { onDelete: 'cascade' }),
    // 关联歌曲（可选，聚焦特定歌曲的会话）
    songId: uuid('song_id').references(() => songs.id, { onDelete: 'set null' }),
    // 会话模式
    mode: sessionModeEnum('mode').default('mixed').notNull(),
    // 开始时间
    startedAt: timestamp('started_at').defaultNow().notNull(),
    // 结束时间
    endedAt: timestamp('ended_at'),
    // 会话交互记录（JSONB 存储事件列表）
    interactions: jsonb('interactions').$type<
      Array<{
        type: 'play' | 'pause' | 'favorite' | 'unfavorite' | 'review' | 'master';
        targetId: string;
        timestamp: string;
      }>
    >(),
  },
  (table) => [
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_song_id_idx').on(table.songId),
    index('sessions_started_at_idx').on(table.startedAt),
  ]
);

/**
 * AI 对话表
 *
 * 记录用户与 AI 助手的对话（用于歌词解析、词卡生成等）
 * 约束 C4: AI调用日志脱敏 - 不记录敏感信息
 */
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    // 关联用户 - Better Auth 使用 text ID
    userId: text('user_id')
      .notNull()
      .references(() => betterAuthUser.id, { onDelete: 'cascade' }),
    // 对话标题
    title: varchar('title', { length: 200 }).notNull(),
    // 对话摘要
    summary: text('summary'),
    // 关联歌曲（可选）
    songId: uuid('song_id').references(() => songs.id, { onDelete: 'set null' }),
    // 元数据
    metadata: jsonb('metadata').$type<{
      model?: string;
      totalTokens?: number;
      purpose?: 'lyrics_parse' | 'card_generate' | 'chat';
    }>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('conversations_user_id_idx').on(table.userId),
    index('conversations_song_id_idx').on(table.songId),
    index('conversations_created_at_idx').on(table.createdAt),
  ]
);

/**
 * 对话消息表
 *
 * 存储对话中的每条消息
 */
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    // 关联对话
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    // 消息角色
    role: messageRoleEnum('role').notNull(),
    // 消息内容
    content: text('content').notNull(),
    // Token 数量
    tokens: integer('tokens'),
    // 元数据
    metadata: jsonb('metadata').$type<{
      model?: string;
      finishReason?: string;
    }>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('messages_conversation_id_idx').on(table.conversationId),
    index('messages_created_at_idx').on(table.createdAt),
  ]
);

// ============================================================================
// 关系定义
// ============================================================================

export const userProfilesRelations = relations(userProfiles, ({ many }) => ({
  favorites: many(favorites),
  cardProgress: many(cardProgress),
  sessions: many(sessions),
}));

export const songsRelations = relations(songs, ({ many }) => ({
  lines: many(lines),
  sessions: many(sessions),
}));

export const linesRelations = relations(lines, ({ one, many }) => ({
  song: one(songs, {
    fields: [lines.songId],
    references: [songs.id],
  }),
  cards: many(cards),
  favorites: many(favorites),
}));

export const cardsRelations = relations(cards, ({ one, many }) => ({
  line: one(lines, {
    fields: [cards.lineId],
    references: [lines.id],
  }),
  progress: many(cardProgress),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  line: one(lines, {
    fields: [favorites.lineId],
    references: [lines.id],
  }),
}));

export const cardProgressRelations = relations(cardProgress, ({ one }) => ({
  card: one(cards, {
    fields: [cardProgress.cardId],
    references: [cards.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  song: one(songs, {
    fields: [sessions.songId],
    references: [songs.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  song: one(songs, {
    fields: [conversations.songId],
    references: [songs.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

// ============================================================================
// 类型导出
// ============================================================================

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;

export type Song = typeof songs.$inferSelect;
export type NewSong = typeof songs.$inferInsert;

export type Line = typeof lines.$inferSelect;
export type NewLine = typeof lines.$inferInsert;

export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;

export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;

export type CardProgress = typeof cardProgress.$inferSelect;
export type NewCardProgress = typeof cardProgress.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
