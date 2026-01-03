/**
 * AI 服务函数
 *
 * 提供词卡生成和歌词解析功能
 * 支持真实 AI 调用和 Mock 模式
 */

import { openai, AI_CONFIG, isMockMode } from './config';
import {
  CARD_GENERATION_SYSTEM_PROMPT,
  LYRICS_PARSER_SYSTEM_PROMPT,
  createCardGenerationPrompt,
  createLyricsParserPrompt,
  createSingleLineParserPrompt,
} from './prompts';
import { generateMockCard, parseMockLyrics } from '../mock/ai-responses';
import type { Line } from '@/types';

// ============================================
// 类型定义
// ============================================

/** 生成的词卡数据 */
export interface GeneratedCard {
  word: string;
  reading: string;
  meaning: string;
  partOfSpeech: 'noun' | 'verb' | 'adjective' | 'adverb' | 'particle' | 'other';
  wordPosition?: { start: number; end: number };
}

/** 解析后的歌词行数据 */
export interface ParsedLine {
  lineNumber: number;
  contentJa: string;
  contentZh: string;
  furigana: string; // JSON 字符串
  tokens: string; // JSON 字符串
}

/** Furigana 注音项 */
export interface FuriganaItem {
  word: string;
  reading: string;
  start: number;
  end: number;
}

/** Token 分词项 */
export interface TokenItem {
  word: string;
  reading: string;
  pos: string;
}

// ============================================
// 辅助函数 - JSON 提取
// ============================================

/**
 * 从文本中提取 JSON 对象
 */
function extractJSON(text: string): object | null {
  // 先尝试直接解析（如果整个响应就是 JSON）
  try {
    return JSON.parse(text);
  } catch {
    // 继续尝试提取
  }

  // 尝试找到 JSON 对象的起始位置
  const startIndex = text.indexOf('{');
  if (startIndex === -1) {
    console.error('[AI] No JSON object found in response:', text.substring(0, 200));
    return null;
  }

  // 从起始位置开始，匹配括号找到完整的 JSON
  let braceCount = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') braceCount++;
    if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        const jsonStr = text.slice(startIndex, i + 1);
        try {
          return JSON.parse(jsonStr);
        } catch (e) {
          console.error('[AI] Failed to parse extracted JSON:', jsonStr.substring(0, 200), e);
          return null;
        }
      }
    }
  }

  console.error('[AI] Incomplete JSON in response');
  return null;
}

// ============================================
// 词卡生成服务
// ============================================

/**
 * 从歌词行生成词卡
 *
 * @param line - 歌词行数据
 * @returns 生成的词卡数组
 */
export async function generateCardsFromLine(line: Line): Promise<GeneratedCard[]> {
  // Mock 模式
  if (isMockMode()) {
    console.log('[AI] Mock mode enabled, using mock card generation');
    const mockCard = await generateMockCard(line);
    return [{
      word: mockCard.word,
      reading: mockCard.reading,
      meaning: mockCard.meaning,
      partOfSpeech: mockCard.partOfSpeech as GeneratedCard['partOfSpeech'],
    }];
  }

  try {
    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.cardGeneration.model,
      messages: [
        { role: 'system', content: CARD_GENERATION_SYSTEM_PROMPT + '\n\n请用 JSON 格式输出，格式为：{"cards": [...]}' },
        { role: 'user', content: createCardGenerationPrompt(line.contentJa, line.contentZh) },
      ],
      temperature: AI_CONFIG.cardGeneration.temperature,
      max_tokens: AI_CONFIG.cardGeneration.maxTokens,
    });

    const text = completion.choices[0]?.message?.content || '';

    // 从响应中提取 JSON
    const parsed = extractJSON(text) as { cards?: GeneratedCard[] } | null;
    if (!parsed) {
      throw new Error('无法解析 AI 响应');
    }
    return parsed.cards || [];
  } catch (error) {
    console.error('[AI] Card generation error:', error);
    throw new Error('词卡生成失败，请稍后重试');
  }
}

/**
 * 流式生成词卡（用于实时显示生成过程）
 *
 * @param line - 歌词行数据
 * @returns AsyncGenerator
 */
export async function* streamCardGeneration(line: Line) {
  // Mock 模式使用 mock 流
  if (isMockMode()) {
    const { streamMockCardGeneration } = await import('../mock/ai-responses');
    yield* streamMockCardGeneration(line);
    return;
  }

  // 使用 OpenAI SDK
  const completion = await openai.chat.completions.create({
    model: AI_CONFIG.cardGeneration.model,
    messages: [
      { role: 'system', content: CARD_GENERATION_SYSTEM_PROMPT + '\n\n请用 JSON 格式输出，格式为：{"cards": [...]}' },
      { role: 'user', content: createCardGenerationPrompt(line.contentJa, line.contentZh) },
    ],
    temperature: AI_CONFIG.cardGeneration.temperature,
    max_tokens: AI_CONFIG.cardGeneration.maxTokens,
  });

  const text = completion.choices[0]?.message?.content || '';

  try {
    const parsed = extractJSON(text) as { cards?: GeneratedCard[] } | null;
    if (!parsed) {
      yield { type: 'error', value: '解析响应失败' };
      return;
    }
    const cards = parsed.cards || [];
    for (const card of cards) {
      yield { type: 'card', value: card };
    }
    yield { type: 'complete', value: cards };
  } catch {
    yield { type: 'error', value: '解析响应失败' };
  }
}

// ============================================
// 歌词解析服务
// ============================================

/**
 * 批量解析歌词（添加注音和翻译）
 * 支持分批处理，避免 AI 响应被截断
 *
 * @param lyrics - 原始歌词行数组
 * @returns 解析后的歌词数组
 */
export async function parseLyrics(lyrics: string[]): Promise<ParsedLine[]> {
  // Mock 模式
  if (isMockMode()) {
    console.log('[AI] Mock mode enabled, using mock lyrics parser');
    const mockLines = await parseMockLyrics(lyrics.join('\n'));
    return mockLines.map((line, i) => ({
      lineNumber: i + 1,
      contentJa: line.contentJa,
      contentZh: line.contentZh || '',
      furigana: '[]',
      tokens: '[]',
    }));
  }

  const batchSize = AI_CONFIG.lyricsParser.batchSize;
  const results: ParsedLine[] = [];

  // 分批处理歌词
  for (let i = 0; i < lyrics.length; i += batchSize) {
    const batch = lyrics.slice(i, i + batchSize);
    const batchStartIndex = i;

    console.log(`[AI] Processing lyrics batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(lyrics.length / batchSize)} (lines ${i + 1}-${Math.min(i + batchSize, lyrics.length)})`);

    try {
      const batchResults = await parseLyricsBatch(batch, batchStartIndex);
      results.push(...batchResults);
    } catch (error) {
      console.error(`[AI] Batch ${Math.floor(i / batchSize) + 1} parsing error:`, error);
      // 如果批次失败，添加空结果以保持行号对应
      for (let j = 0; j < batch.length; j++) {
        results.push({
          lineNumber: batchStartIndex + j + 1,
          contentJa: batch[j],
          contentZh: '',
          furigana: '[]',
          tokens: '[]',
        });
      }
    }
  }

  return results;
}

/**
 * 解析单批歌词
 */
async function parseLyricsBatch(lyrics: string[], startIndex: number): Promise<ParsedLine[]> {
  try {
    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.lyricsParser.model,
      messages: [
        { role: 'system', content: LYRICS_PARSER_SYSTEM_PROMPT + '\n\n请用 JSON 格式输出，格式为：{"lines": [...]}' },
        { role: 'user', content: createLyricsParserPrompt(lyrics) },
      ],
      temperature: AI_CONFIG.lyricsParser.temperature,
      max_tokens: AI_CONFIG.lyricsParser.maxTokens,
    });

    const text = completion.choices[0]?.message?.content || '';
    console.log(`[AI] Batch response length: ${text.length} chars`);

    // 从响应中提取 JSON
    const parsed = extractJSON(text) as { lines?: ParsedLine[] } | null;
    if (!parsed) {
      console.error('[AI] Failed to extract JSON from batch response');
      throw new Error('无法解析 AI 响应');
    }

    // 调整行号以匹配原始索引
    const lines = parsed.lines || [];
    return lines.map((line, i) => ({
      ...line,
      lineNumber: startIndex + i + 1,
    }));
  } catch (error) {
    console.error('[AI] Lyrics batch parsing error:', error);
    throw new Error('歌词解析失败，请稍后重试');
  }
}

/**
 * 解析单行歌词
 *
 * @param contentJa - 日文歌词
 * @returns 解析结果
 */
export async function parseSingleLine(contentJa: string): Promise<{
  contentZh: string;
  furigana: FuriganaItem[];
  tokens: TokenItem[];
}> {
  // Mock 模式
  if (isMockMode()) {
    return {
      contentZh: `（${contentJa} 的翻译）`,
      furigana: [],
      tokens: [],
    };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.lyricsParser.model,
      messages: [
        { role: 'system', content: LYRICS_PARSER_SYSTEM_PROMPT },
        { role: 'user', content: createSingleLineParserPrompt(contentJa) },
      ],
      temperature: AI_CONFIG.lyricsParser.temperature,
      max_tokens: 500,
    });

    const text = completion.choices[0]?.message?.content || '';
    const result = extractJSON(text) as { contentZh?: string; furigana?: FuriganaItem[]; tokens?: TokenItem[] } | null;
    if (!result) {
      throw new Error('无法解析 AI 响应');
    }
    return {
      contentZh: result.contentZh || '',
      furigana: Array.isArray(result.furigana) ? result.furigana : [],
      tokens: Array.isArray(result.tokens) ? result.tokens : [],
    };
  } catch (error) {
    console.error('[AI] Single line parsing error:', error);
    throw new Error('歌词行解析失败');
  }
}

// ============================================
// 辅助函数
// ============================================

/**
 * 解析 furigana JSON 字符串
 */
export function parseFurigana(furiganaStr: string): FuriganaItem[] {
  try {
    const parsed = JSON.parse(furiganaStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * 解析 tokens JSON 字符串
 */
export function parseTokens(tokensStr: string): TokenItem[] {
  try {
    const parsed = JSON.parse(tokensStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
