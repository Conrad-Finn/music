/**
 * AI 服务配置
 *
 * 使用 OpenAI SDK + OpenAI 兼容 API
 * 支持 SiliconFlow、OpenRouter 等 OpenAI 兼容服务
 */

import OpenAI from 'openai';

// 创建 OpenAI 客户端
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

// 默认模型配置
export const AI_CONFIG = {
  // 词卡生成模型
  cardGeneration: {
    model: process.env.AI_CARD_MODEL || 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 1500,
  },
  // 歌词解析模型
  lyricsParser: {
    model: process.env.AI_LYRICS_MODEL || 'gpt-4o-mini',
    temperature: 0.2,
    maxTokens: 8000, // 增加限制以支持更多歌词行
    batchSize: 8, // 每批处理的歌词行数
  },
} as const;

// 判断是否启用 Mock 模式
export function isMockMode(): boolean {
  return process.env.AI_MOCK_MODE === 'true' || !process.env.OPENAI_API_KEY;
}
