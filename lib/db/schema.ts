// src/lib/db/schema.ts
// 听日文歌项目 - 数据库 Schema 定义
// 基于 cog.md 实体模型设计

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// E1: 用户表 (Users)
// ============================================
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique(),  // 可选，用于账号恢复
  nickname: varchar('nickname', { length: 100 }),     // 展示名称
  avatarUrl: varchar('avatar_url', { length: 500 }),  // 头像 URL
  status: varchar('status', { length: 20 }).default('guest').notNull(), // guest | registered | premium
  preferences: jsonb('preferences').default({}),      // 用户偏好设置
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('idx_users_email').on(table.email),
}));

// ============================================
// E2: 歌曲表 (Songs)
// ============================================
export const songs = pgTable('songs', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 300 }).notNull(),       // 歌曲标题
  artist: varchar('artist', { length: 200 }),               // 艺术家
  album: varchar('album', { length: 300 }),                 // 专辑名
  duration: integer('duration'),                            // 时长（秒）
  coverUrl: varchar('cover_url', { length: 500 }),          // 封面图 URL
  sourceType: varchar('source_type', { length: 20 }).notNull(), // local | platform
  sourceRef: varchar('source_ref', { length: 500 }),        // 平台引用 ID（C1 版权合规）
  genre: varchar('genre', { length: 50 }),                  // 类型：jpop | anime | drama | emotional
  difficulty: varchar('difficulty', { length: 20 }),        // 难度：easy | medium | hard
  lyricsRaw: text('lyrics_raw'),                           // 原始歌词（LRC 格式）
  createdBy: uuid('created_by').references(() => users.id), // 导入者
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  titleIdx: index('idx_songs_title').on(table.title),
  artistIdx: index('idx_songs_artist').on(table.artist),
  genreIdx: index('idx_songs_genre').on(table.genre),
}));

// ============================================
// E3: 歌词句子表 (Lines)
// ============================================
export const lines = pgTable('lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  songId: uuid('song_id').notNull().references(() => songs.id, { onDelete: 'cascade' }),
  lineNumber: integer('line_number').notNull(),             // 行号
  contentJa: text('content_ja').notNull(),                  // 日文原文
  contentZh: text('content_zh'),                            // 中文翻译
  furigana: text('furigana'),                               // 假名注音
  startTime: integer('start_time'),                         // 开始时间（毫秒）
  endTime: integer('end_time'),                             // 结束时间（毫秒）
  position: varchar('position', { length: 20 }),            // 位置：verse | chorus | bridge
  emotion: varchar('emotion', { length: 20 }),              // 情绪：sweet | sad | hype | nostalgic
  tokens: jsonb('tokens').default([]),                      // 分词结果 [{word, reading, pos}]
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  songIdx: index('idx_lines_song').on(table.songId),
  timeIdx: index('idx_lines_time').on(table.songId, table.startTime),
}));

// ============================================
// E4: 学习卡片表 (Cards)
// ============================================
export const cards = pgTable('cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  lineId: uuid('line_id').notNull().references(() => lines.id, { onDelete: 'cascade' }),
  word: varchar('word', { length: 100 }).notNull(),         // 目标词汇
  reading: varchar('reading', { length: 100 }),             // 假名读音
  meaning: text('meaning').notNull(),                       // 中文释义
  partOfSpeech: varchar('part_of_speech', { length: 30 }),  // 词性：noun | verb | adj | other
  exampleSentence: text('example_sentence'),                // 例句
  audioClipUrl: varchar('audio_clip_url', { length: 500 }), // 发音片段 URL（可选）
  wordPosition: integer('word_position'),                   // 词在句中的位置
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  lineIdx: index('idx_cards_line').on(table.lineId),
  wordIdx: index('idx_cards_word').on(table.word),
}));

// ============================================
// E5: 会话表 (Sessions)
// ============================================
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  songId: uuid('song_id').references(() => songs.id),       // 聚焦歌曲
  mode: varchar('mode', { length: 20 }).default('mixed'),   // pure_listen | learning | mixed
  startedAt: timestamp('started_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),
  interactions: jsonb('interactions').default([]),          // 交互事件列表
}, (table) => ({
  userIdx: index('idx_sessions_user').on(table.userId),
  songIdx: index('idx_sessions_song').on(table.songId),
  timeIdx: index('idx_sessions_time').on(table.userId, table.startedAt),
}));

// ============================================
// 关联表: 用户-歌曲（收藏/播放记录）
// ============================================
export const userSongs = pgTable('user_songs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  songId: uuid('song_id').notNull().references(() => songs.id, { onDelete: 'cascade' }),
  isFavorite: boolean('is_favorite').default(false),        // 是否收藏
  playCount: integer('play_count').default(0),              // 播放次数
  lastPlayedAt: timestamp('last_played_at'),                // 最后播放时间
  learnedWordsCount: integer('learned_words_count').default(0), // 已学词数
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userSongIdx: uniqueIndex('idx_user_songs_unique').on(table.userId, table.songId),
  favoriteIdx: index('idx_user_songs_favorite').on(table.userId, table.isFavorite),
}));

// ============================================
// 关联表: 用户-卡片（学习记录）
// ============================================
export const userCards = pgTable('user_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  cardId: uuid('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).default('new').notNull(), // new | learning | mastered
  reviewCount: integer('review_count').default(0),          // 复习次数
  lastReviewedAt: timestamp('last_reviewed_at'),            // 最后复习时间
  masteredAt: timestamp('mastered_at'),                     // 掌握时间
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userCardIdx: uniqueIndex('idx_user_cards_unique').on(table.userId, table.cardId),
  statusIdx: index('idx_user_cards_status').on(table.userId, table.status),
}));

// ============================================
// 关联表: 用户-句子（标记喜欢）
// ============================================
export const userLines = pgTable('user_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lineId: uuid('line_id').notNull().references(() => lines.id, { onDelete: 'cascade' }),
  isLiked: boolean('is_liked').default(false),              // 是否喜欢
  note: text('note'),                                       // 用户笔记
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userLineIdx: uniqueIndex('idx_user_lines_unique').on(table.userId, table.lineId),
}));

// ============================================
// Relations (Drizzle ORM 关系定义)
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
  songs: many(userSongs),
  cards: many(userCards),
  sessions: many(sessions),
  lines: many(userLines),
}));

export const songsRelations = relations(songs, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [songs.createdBy],
    references: [users.id],
  }),
  lines: many(lines),
  userSongs: many(userSongs),
  sessions: many(sessions),
}));

export const linesRelations = relations(lines, ({ one, many }) => ({
  song: one(songs, {
    fields: [lines.songId],
    references: [songs.id],
  }),
  cards: many(cards),
  userLines: many(userLines),
}));

export const cardsRelations = relations(cards, ({ one, many }) => ({
  line: one(lines, {
    fields: [cards.lineId],
    references: [lines.id],
  }),
  userCards: many(userCards),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
  song: one(songs, {
    fields: [sessions.songId],
    references: [songs.id],
  }),
}));

export const userSongsRelations = relations(userSongs, ({ one }) => ({
  user: one(users, {
    fields: [userSongs.userId],
    references: [users.id],
  }),
  song: one(songs, {
    fields: [userSongs.songId],
    references: [songs.id],
  }),
}));

export const userCardsRelations = relations(userCards, ({ one }) => ({
  user: one(users, {
    fields: [userCards.userId],
    references: [users.id],
  }),
  card: one(cards, {
    fields: [userCards.cardId],
    references: [cards.id],
  }),
}));

export const userLinesRelations = relations(userLines, ({ one }) => ({
  user: one(users, {
    fields: [userLines.userId],
    references: [users.id],
  }),
  line: one(lines, {
    fields: [userLines.lineId],
    references: [lines.id],
  }),
}));
