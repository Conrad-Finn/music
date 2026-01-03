/**
 * 歌曲服务 - Songs Service
 *
 * 提供歌曲相关的 CRUD 操作
 * 遵循 real.md 约束:
 * - C1: 版权合规 - 不存储完整音源，仅存储 sourceRef
 * - C2: 数据隔离 - 私有歌曲通过 creatorId 隔离
 */

import { db } from '@/db';
import { songs, lines } from '@/db/schema';
import { eq, ilike, or, and, desc, sql } from 'drizzle-orm';
import type { Song, NewSong, Line, NewLine } from '@/db/schema';

// ============================================================================
// 类型定义
// ============================================================================

export interface SongWithLines extends Song {
  lines: Line[];
}

export interface CreateSongInput {
  title: string;
  artist?: string;
  duration?: number;
  coverUrl?: string;
  source?: 'local' | 'platform';
  sourceRef?: string;
  creatorId?: string;
  isPublic?: boolean;
}

export interface UpdateSongInput {
  title?: string;
  artist?: string;
  duration?: number;
  coverUrl?: string;
  sourceRef?: string;
  isPublic?: boolean;
}

export interface CreateLineInput {
  songId: string;
  lineNumber: number;
  contentJa: string;
  contentZh?: string;
  furigana?: Array<{ word: string; reading: string; start: number; end: number }>;
  tokens?: Array<{ word: string; reading: string; pos: string }>;
  startTime?: number;
  endTime?: number;
}

export interface SongsQueryOptions {
  search?: string;
  limit?: number;
  offset?: number;
  creatorId?: string;
  includePublic?: boolean;
}

// ============================================================================
// CRUD 操作
// ============================================================================

/**
 * 创建歌曲
 */
export async function createSong(input: CreateSongInput): Promise<Song> {
  const [song] = await db
    .insert(songs)
    .values({
      title: input.title,
      artist: input.artist,
      duration: input.duration,
      coverUrl: input.coverUrl,
      source: input.source || 'platform',
      sourceRef: input.sourceRef,
      creatorId: input.creatorId,
      isPublic: input.isPublic ?? true,
    })
    .returning();

  return song;
}

/**
 * 通过 ID 获取歌曲
 */
export async function getSongById(id: string): Promise<Song | null> {
  const song = await db.query.songs.findFirst({
    where: eq(songs.id, id),
  });

  return song ?? null;
}

/**
 * 获取歌曲及其歌词
 */
export async function getSongWithLines(id: string): Promise<SongWithLines | null> {
  const song = await db.query.songs.findFirst({
    where: eq(songs.id, id),
    with: {
      lines: {
        orderBy: (lines, { asc }) => [asc(lines.lineNumber)],
      },
    },
  });

  return song ?? null;
}

/**
 * 查询歌曲列表
 */
export async function getSongs(options: SongsQueryOptions = {}): Promise<{
  data: Song[];
  total: number;
}> {
  const { search, limit = 10, offset = 0, creatorId, includePublic = true } = options;

  // 构建查询条件
  const conditions = [];

  // 搜索条件
  if (search) {
    conditions.push(
      or(ilike(songs.title, `%${search}%`), ilike(songs.artist, `%${search}%`))
    );
  }

  // 访问权限条件
  if (creatorId) {
    if (includePublic) {
      conditions.push(or(eq(songs.creatorId, creatorId), eq(songs.isPublic, true)));
    } else {
      conditions.push(eq(songs.creatorId, creatorId));
    }
  } else if (includePublic) {
    conditions.push(eq(songs.isPublic, true));
  }

  const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

  // 执行查询
  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(songs)
      .where(whereCondition)
      .orderBy(desc(songs.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(songs)
      .where(whereCondition),
  ]);

  return {
    data,
    total: countResult[0]?.count ?? 0,
  };
}

/**
 * 更新歌曲
 */
export async function updateSong(id: string, input: UpdateSongInput): Promise<Song | null> {
  const [song] = await db
    .update(songs)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(songs.id, id))
    .returning();

  return song ?? null;
}

/**
 * 删除歌曲
 */
export async function deleteSong(id: string): Promise<boolean> {
  const result = await db.delete(songs).where(eq(songs.id, id));
  return (result.rowCount ?? 0) > 0;
}

// ============================================================================
// 歌词操作
// ============================================================================

/**
 * 批量创建歌词行
 */
export async function createLines(linesData: CreateLineInput[]): Promise<Line[]> {
  if (linesData.length === 0) return [];

  const result = await db
    .insert(lines)
    .values(
      linesData.map((line) => ({
        songId: line.songId,
        lineNumber: line.lineNumber,
        contentJa: line.contentJa,
        contentZh: line.contentZh,
        furigana: line.furigana,
        startTime: line.startTime,
        endTime: line.endTime,
      }))
    )
    .returning();

  return result;
}

/**
 * 获取歌曲的所有歌词行
 */
export async function getLinesBySongId(songId: string): Promise<Line[]> {
  return db.query.lines.findMany({
    where: eq(lines.songId, songId),
    orderBy: (lines, { asc }) => [asc(lines.lineNumber)],
  });
}

/**
 * 通过 ID 获取歌词行
 */
export async function getLineById(id: string): Promise<Line | null> {
  const line = await db.query.lines.findFirst({
    where: eq(lines.id, id),
  });

  return line ?? null;
}

/**
 * 更新歌词行
 */
export async function updateLine(
  id: string,
  input: Partial<CreateLineInput>
): Promise<Line | null> {
  const [line] = await db
    .update(lines)
    .set(input)
    .where(eq(lines.id, id))
    .returning();

  return line ?? null;
}

/**
 * 删除歌词行
 */
export async function deleteLine(id: string): Promise<boolean> {
  const result = await db.delete(lines).where(eq(lines.id, id));
  return (result.rowCount ?? 0) > 0;
}

/**
 * 删除歌曲的所有歌词行
 */
export async function deleteLinesBySongId(songId: string): Promise<number> {
  const result = await db.delete(lines).where(eq(lines.songId, songId));
  return result.rowCount ?? 0;
}
