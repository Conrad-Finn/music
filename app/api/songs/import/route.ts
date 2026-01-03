/**
 * 歌曲导入并解析 API
 *
 * POST /api/songs/import
 * 一键完成：创建歌曲 → AI 解析歌词 → 生成词卡
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { createSong, createLines, updateLine, getLinesBySongId } from '@/services/songs.service';
import { createCard } from '@/services/cards.service';
import { parseLyrics, generateCardsFromLine, isMockMode } from '@/lib/ai';

// 请求验证 Schema
const importSongSchema = z.object({
  // 歌曲信息
  title: z.string().min(1).max(200),
  artist: z.string().max(100).optional(),
  duration: z.number().optional(),
  coverUrl: z.string().url().optional(),
  source: z.enum(['local', 'platform']).optional(),
  sourceRef: z.string().max(255).optional(),
  isPublic: z.boolean().optional().default(true),

  // 原始歌词（按行分割）
  lyrics: z.array(z.string().min(1)).min(1),

  // 可选：时间轴数据
  timestamps: z
    .array(
      z.object({
        startTime: z.number(),
        endTime: z.number(),
      })
    )
    .optional(),

  // 处理选项
  options: z
    .object({
      parseWithAI: z.boolean().default(true), // 是否使用 AI 解析
      generateCards: z.boolean().default(false), // 是否自动生成词卡
      cardsPerLine: z.number().min(1).max(3).default(1), // 每行生成词卡数
    })
    .optional()
    .default({}),
});

/**
 * POST /api/songs/import
 * 导入歌曲并自动解析
 */
export async function POST(request: NextRequest) {
  try {
    // 从认证中获取 userId
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const userId = session.user.id;

    // 解析请求体
    const body = await request.json();
    const validation = importSongSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: '参数无效', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { title, artist, duration, coverUrl, source, sourceRef, isPublic, lyrics, timestamps, options } =
      validation.data;

    // Step 1: 创建歌曲
    const song = await createSong({
      title,
      artist,
      duration,
      coverUrl,
      source,
      sourceRef,
      creatorId: userId,
      isPublic,
    });

    // Step 2: 创建原始歌词行
    const linesData = lyrics.map((contentJa, index) => ({
      songId: song.id,
      lineNumber: index + 1,
      contentJa,
      startTime: timestamps?.[index]?.startTime,
      endTime: timestamps?.[index]?.endTime,
    }));

    const createdLines = await createLines(linesData);

    // Step 3: AI 解析歌词（添加注音和翻译）
    let parsedLines: typeof createdLines = createdLines;

    if (options.parseWithAI) {
      try {
        const aiParsed = await parseLyrics(lyrics);

        // 更新歌词行
        await Promise.all(
          createdLines.map(async (line, index) => {
            const parsed = aiParsed[index];
            if (parsed) {
              // 解析 JSON 字符串为对象（AI 返回的 furigana 是 JSON 字符串）
              let furiganaArray: Array<{ word: string; reading: string; start: number; end: number }> | undefined;

              try {
                if (parsed.furigana && parsed.furigana !== '[]') {
                  furiganaArray = JSON.parse(parsed.furigana);
                }
              } catch (e) {
                console.error('解析 furigana 失败:', e);
              }

              await updateLine(line.id, {
                contentZh: parsed.contentZh,
                furigana: furiganaArray,
              });
            }
          })
        );

        // 重新获取更新后的歌词行
        parsedLines = await getLinesBySongId(song.id);
      } catch (aiError) {
        console.error('AI 解析歌词失败:', aiError);
        // AI 失败不影响歌曲创建，继续流程
      }
    }

    // Step 4: 自动生成词卡（可选）
    const generatedCards: Array<{ lineId: string; cards: unknown[] }> = [];

    // 有效的词性枚举值
    const validPartOfSpeech = ['noun', 'verb', 'adjective', 'adverb', 'particle', 'other'] as const;
    type PartOfSpeech = (typeof validPartOfSpeech)[number];

    // 验证并映射词性
    const normalizePartOfSpeech = (pos: string | undefined): PartOfSpeech => {
      if (!pos) return 'other';
      const lowered = pos.toLowerCase();
      if (validPartOfSpeech.includes(lowered as PartOfSpeech)) {
        return lowered as PartOfSpeech;
      }
      // 常见映射
      if (lowered === 'pronoun' || lowered === 'pron') return 'other';
      if (lowered === 'conjunction' || lowered === 'conj') return 'other';
      if (lowered === 'preposition' || lowered === 'prep') return 'particle';
      if (lowered === 'interjection' || lowered === 'interj') return 'other';
      return 'other';
    };

    if (options.generateCards) {
      for (const line of parsedLines) {
        try {
          const cards = await generateCardsFromLine({
            id: line.id,
            contentJa: line.contentJa,
            contentZh: line.contentZh || '',
            furigana: typeof line.furigana === 'string' ? line.furigana : '',
            startTime: line.startTime || 0,
            endTime: line.endTime || 0,
          });

          const savedCards = await Promise.all(
            cards.slice(0, options.cardsPerLine).map((card) =>
              createCard({
                lineId: line.id,
                word: card.word,
                reading: card.reading,
                meaning: card.meaning,
                partOfSpeech: normalizePartOfSpeech(card.partOfSpeech),
                exampleSentence: line.contentJa,
                exampleTranslation: line.contentZh || undefined,
                wordPosition: card.wordPosition,
              })
            )
          );

          generatedCards.push({ lineId: line.id, cards: savedCards });
        } catch (cardError) {
          console.error(`为歌词行 ${line.id} 生成词卡失败:`, cardError);
        }
      }
    }

    return NextResponse.json({
      data: {
        song,
        lines: parsedLines,
        cards: generatedCards,
      },
      meta: {
        linesCount: parsedLines.length,
        cardsCount: generatedCards.reduce((sum, g) => sum + g.cards.length, 0),
        mockMode: isMockMode(),
        parseWithAI: options.parseWithAI,
        generateCards: options.generateCards,
      },
    });
  } catch (error) {
    console.error('POST /api/songs/import 错误:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: '导入失败，请稍后重试' }, { status: 500 });
  }
}
