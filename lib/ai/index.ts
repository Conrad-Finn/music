/**
 * AI 模块统一导出
 */

// 配置
export { openai, AI_CONFIG, isMockMode } from './config';

// 提示词
export {
  CARD_GENERATION_SYSTEM_PROMPT,
  LYRICS_PARSER_SYSTEM_PROMPT,
  createCardGenerationPrompt,
  createLyricsParserPrompt,
  createSingleLineParserPrompt,
} from './prompts';

// 服务
export {
  generateCardsFromLine,
  streamCardGeneration,
  parseLyrics,
  parseSingleLine,
  parseFurigana,
  parseTokens,
  type GeneratedCard,
  type ParsedLine,
  type FuriganaItem,
  type TokenItem,
} from './services';
