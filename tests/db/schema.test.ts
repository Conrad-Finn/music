/**
 * 数据库测试 - 听日文歌项目
 *
 * 测试数据库 schema 和基本 CRUD 操作
 * 使用 Neon 开发分支进行隔离测试
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '@/db';
import { songs, lines, cards, favorites, conversations, messages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  TEST_USER_ID,
  createMockSong,
  createMockLine,
  createMockCard,
} from '../mocks/data';

describe('Database Schema', () => {
  // 存储测试中创建的 IDs
  const createdSongIds: string[] = [];
  const createdLineIds: string[] = [];
  const createdCardIds: string[] = [];

  afterAll(async () => {
    // 清理测试数据（按依赖顺序反向删除）
    for (const id of createdCardIds) {
      await db.delete(cards).where(eq(cards.id, id));
    }
    for (const id of createdLineIds) {
      await db.delete(lines).where(eq(lines.id, id));
    }
    for (const id of createdSongIds) {
      await db.delete(songs).where(eq(songs.id, id));
    }
  });

  describe('Songs 表', () => {
    it('应成功创建歌曲', async () => {
      const [song] = await db
        .insert(songs)
        .values(createMockSong({ title: '测试歌曲 1', artist: 'テスト' }))
        .returning();

      createdSongIds.push(song.id);

      expect(song).toBeDefined();
      expect(song.id).toBeDefined();
      expect(song.title).toBe('测试歌曲 1');
      expect(song.artist).toBe('テスト');
      expect(song.isPublic).toBe(true);
    });

    it('应正确存储歌曲来源信息', async () => {
      const [song] = await db
        .insert(songs)
        .values(
          createMockSong({
            title: '本地歌曲',
            source: 'local',
            sourceRef: null,
            isPublic: false,
          })
        )
        .returning();

      createdSongIds.push(song.id);

      expect(song.source).toBe('local');
      expect(song.isPublic).toBe(false);
    });

    it('应自动设置时间戳', async () => {
      const [song] = await db
        .insert(songs)
        .values(createMockSong({ title: '时间戳测试' }))
        .returning();

      createdSongIds.push(song.id);

      expect(song.createdAt).toBeInstanceOf(Date);
      expect(song.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Lines 表 (歌词)', () => {
    let testSongId: string;

    beforeAll(async () => {
      const [song] = await db
        .insert(songs)
        .values(createMockSong({ title: '歌词测试歌曲' }))
        .returning();

      testSongId = song.id;
      createdSongIds.push(testSongId);
    });

    it('应成功创建歌词行', async () => {
      const [line] = await db
        .insert(lines)
        .values(
          createMockLine(testSongId, {
            lineNumber: 1,
            contentJa: '夜空に輝く星',
            contentZh: '在夜空中闪耀的星星',
          })
        )
        .returning();

      createdLineIds.push(line.id);

      expect(line).toBeDefined();
      expect(line.songId).toBe(testSongId);
      expect(line.contentJa).toBe('夜空に輝く星');
    });

    it('应正确存储假名信息 (JSONB)', async () => {
      const furiganaData = [
        { word: '夜空', reading: 'よぞら', start: 0, end: 2 },
        { word: '輝く', reading: 'かがやく', start: 3, end: 5 },
        { word: '星', reading: 'ほし', start: 5, end: 6 },
      ];

      const [line] = await db
        .insert(lines)
        .values(
          createMockLine(testSongId, {
            lineNumber: 2,
            contentJa: '夜空に輝く星',
            furigana: furiganaData,
          })
        )
        .returning();

      createdLineIds.push(line.id);

      expect(line.furigana).toEqual(furiganaData);
    });

    it('应正确存储时间轴信息', async () => {
      const [line] = await db
        .insert(lines)
        .values(
          createMockLine(testSongId, {
            lineNumber: 3,
            startTime: 5000,
            endTime: 10000,
          })
        )
        .returning();

      createdLineIds.push(line.id);

      expect(line.startTime).toBe(5000);
      expect(line.endTime).toBe(10000);
    });

    it('删除歌曲应级联删除歌词', async () => {
      // 创建临时歌曲和歌词
      const [tempSong] = await db
        .insert(songs)
        .values(createMockSong({ title: '临时歌曲' }))
        .returning();

      await db
        .insert(lines)
        .values(createMockLine(tempSong.id, { lineNumber: 1 }));

      // 删除歌曲
      await db.delete(songs).where(eq(songs.id, tempSong.id));

      // 验证歌词也被删除
      const remainingLines = await db
        .select()
        .from(lines)
        .where(eq(lines.songId, tempSong.id));

      expect(remainingLines.length).toBe(0);
    });
  });

  describe('Cards 表 (学习卡片)', () => {
    let testSongId: string;
    let testLineId: string;

    beforeAll(async () => {
      const [song] = await db
        .insert(songs)
        .values(createMockSong({ title: '卡片测试歌曲' }))
        .returning();

      testSongId = song.id;
      createdSongIds.push(testSongId);

      const [line] = await db
        .insert(lines)
        .values(createMockLine(testSongId, { lineNumber: 1 }))
        .returning();

      testLineId = line.id;
      createdLineIds.push(testLineId);
    });

    it('应成功创建卡片', async () => {
      const [card] = await db
        .insert(cards)
        .values(
          createMockCard(testLineId, {
            word: '夜空',
            reading: 'よぞら',
            meaning: '夜晚的天空',
            partOfSpeech: 'noun',
          })
        )
        .returning();

      createdCardIds.push(card.id);

      expect(card).toBeDefined();
      expect(card.word).toBe('夜空');
      expect(card.reading).toBe('よぞら');
      expect(card.partOfSpeech).toBe('noun');
    });

    it('应正确存储词位置信息 (JSONB)', async () => {
      const [card] = await db
        .insert(cards)
        .values(
          createMockCard(testLineId, {
            word: '輝く',
            wordPosition: { start: 3, end: 5 },
          })
        )
        .returning();

      createdCardIds.push(card.id);

      expect(card.wordPosition).toEqual({ start: 3, end: 5 });
    });
  });

  describe('关系查询', () => {
    let testSongId: string;

    beforeAll(async () => {
      // 创建完整的测试数据
      const [song] = await db
        .insert(songs)
        .values(createMockSong({ title: '关系测试歌曲' }))
        .returning();

      testSongId = song.id;
      createdSongIds.push(testSongId);

      const [line] = await db
        .insert(lines)
        .values(
          createMockLine(testSongId, {
            lineNumber: 1,
            contentJa: 'テスト歌詞',
          })
        )
        .returning();

      createdLineIds.push(line.id);

      const [card] = await db
        .insert(cards)
        .values(createMockCard(line.id, { word: 'テスト' }))
        .returning();

      createdCardIds.push(card.id);
    });

    it('应可以查询歌曲及其歌词', async () => {
      const result = await db.query.songs.findFirst({
        where: eq(songs.id, testSongId),
        with: {
          lines: true,
        },
      });

      expect(result).toBeDefined();
      expect(result!.lines).toBeDefined();
      expect(result!.lines.length).toBeGreaterThan(0);
    });

    it('应可以查询歌词及其卡片', async () => {
      const result = await db.query.lines.findFirst({
        where: eq(lines.songId, testSongId),
        with: {
          cards: true,
        },
      });

      expect(result).toBeDefined();
      expect(result!.cards).toBeDefined();
      expect(result!.cards.length).toBeGreaterThan(0);
    });
  });
});
