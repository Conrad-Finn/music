/**
 * 数据库 Seed 脚本
 *
 * 生成 Mock 数据用于开发和测试
 *
 * 使用方法:
 * bun run db/seed.ts
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { config } from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import * as schema from './schema';

// 加载环境变量
config({ path: '.env' });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// ============================================================================
// Mock 数据定义
// ============================================================================

// 模拟用户 ID（在实际环境中由 Neon Auth 管理）
const MOCK_USER_ID = uuidv4();

// 歌曲数据
const mockSongs = [
  {
    id: uuidv4(),
    title: '夜に駆ける',
    artist: 'YOASOBI',
    duration: 258,
    coverUrl: 'https://example.com/covers/yoru-ni-kakeru.jpg',
    source: 'platform' as const,
    sourceRef: 'spotify:track:1234567890',
    isPublic: true,
  },
  {
    id: uuidv4(),
    title: 'Lemon',
    artist: '米津玄師',
    duration: 254,
    coverUrl: 'https://example.com/covers/lemon.jpg',
    source: 'platform' as const,
    sourceRef: 'spotify:track:0987654321',
    isPublic: true,
  },
  {
    id: uuidv4(),
    title: '紅蓮華',
    artist: 'LiSA',
    duration: 264,
    coverUrl: 'https://example.com/covers/gurenge.jpg',
    source: 'platform' as const,
    sourceRef: 'spotify:track:1122334455',
    isPublic: true,
  },
];

// 歌词数据
const mockLinesMap: Record<string, Array<{ contentJa: string; contentZh: string; startTime: number; endTime: number }>> = {
  '夜に駆ける': [
    { contentJa: '沈むように溶けてゆくように', contentZh: '像是沉没一般 像是融化一般', startTime: 0, endTime: 4000 },
    { contentJa: '二人だけの空が広がる夜に', contentZh: '在只属于我们两人的天空蔓延的夜晚', startTime: 4000, endTime: 8000 },
    { contentJa: 'さよならだけだった', contentZh: '只能说再见了', startTime: 8000, endTime: 11000 },
    { contentJa: 'その一言で全てが分かった', contentZh: '仅凭那一句话就明白了一切', startTime: 11000, endTime: 15000 },
  ],
  'Lemon': [
    { contentJa: '夢ならばどれほどよかったでしょう', contentZh: '如果是梦的话该有多好', startTime: 0, endTime: 5000 },
    { contentJa: '未だにあなたのことを夢にみる', contentZh: '至今仍会在梦中见到你', startTime: 5000, endTime: 10000 },
    { contentJa: '忘れた物を取りに帰るように', contentZh: '就像是回去取回遗忘的东西一般', startTime: 10000, endTime: 15000 },
    { contentJa: '古びた思い出の埃を払う', contentZh: '拂去陈旧回忆上的灰尘', startTime: 15000, endTime: 20000 },
  ],
  '紅蓮華': [
    { contentJa: '強くなれる理由を知った', contentZh: '找到了变强的理由', startTime: 0, endTime: 4000 },
    { contentJa: '僕を連れて進め', contentZh: '带着我前进吧', startTime: 4000, endTime: 7000 },
    { contentJa: '泥だらけの走馬灯に酔う', contentZh: '沉醉于满是泥泞的走马灯', startTime: 7000, endTime: 11000 },
    { contentJa: 'こわばる心震える手は', contentZh: '僵硬的心 颤抖的手', startTime: 11000, endTime: 15000 },
  ],
};

// 词卡数据
const mockCardsData = [
  { word: '沈む', reading: 'しずむ', meaning: '下沉、沉没', partOfSpeech: 'verb' as const },
  { word: '溶ける', reading: 'とける', meaning: '融化、溶解', partOfSpeech: 'verb' as const },
  { word: '夢', reading: 'ゆめ', meaning: '梦、梦想', partOfSpeech: 'noun' as const },
  { word: '強い', reading: 'つよい', meaning: '强的、坚强的', partOfSpeech: 'adjective' as const },
  { word: '進む', reading: 'すすむ', meaning: '前进、进展', partOfSpeech: 'verb' as const },
];

// 对话数据
const mockConversations = [
  {
    id: uuidv4(),
    title: '「夜に駆ける」歌词解析',
    summary: '分析YOASOBI热门歌曲的歌词含义和语法点',
    metadata: { model: 'claude-3-sonnet', totalTokens: 1500, purpose: 'lyrics_parse' as const },
  },
  {
    id: uuidv4(),
    title: '「Lemon」词卡生成',
    summary: '为米津玄师的Lemon生成学习词卡',
    metadata: { model: 'claude-3-sonnet', totalTokens: 800, purpose: 'card_generate' as const },
  },
  {
    id: uuidv4(),
    title: '日语语法问答',
    summary: '关于动词变形和助词使用的问答',
    metadata: { model: 'claude-3-sonnet', totalTokens: 2000, purpose: 'chat' as const },
  },
  {
    id: uuidv4(),
    title: '「紅蓮華」学习笔记',
    summary: '鬼灭之刃主题曲的词汇学习',
    metadata: { model: 'claude-3-sonnet', totalTokens: 1200, purpose: 'lyrics_parse' as const },
  },
  {
    id: uuidv4(),
    title: '每日词汇复习',
    summary: '复习本周学习的新词汇',
    metadata: { model: 'claude-3-sonnet', totalTokens: 600, purpose: 'chat' as const },
  },
];

// 消息数据生成函数
function generateMockMessages(conversationId: string, conversationTitle: string) {
  const messages = [];

  if (conversationTitle.includes('歌词解析')) {
    messages.push(
      { role: 'user' as const, content: '请帮我分析这首歌的歌词含义', tokens: 20 },
      { role: 'assistant' as const, content: '好的，让我来为您分析这首歌的歌词。这首歌表达了...', tokens: 200 },
      { role: 'user' as const, content: '「沈む」这个词是什么意思？', tokens: 15 },
      { role: 'assistant' as const, content: '「沈む」（しずむ）是动词，意思是"下沉、沉没"。在歌词中用来描绘一种坠落的感觉...', tokens: 150 }
    );
  } else if (conversationTitle.includes('词卡生成')) {
    messages.push(
      { role: 'user' as const, content: '请为这句歌词生成学习词卡', tokens: 18 },
      { role: 'assistant' as const, content: '我已经为您生成了以下词卡：\n\n1. 夢（ゆめ）- 梦、梦想\n2. 忘れる（わすれる）- 忘记\n...', tokens: 180 }
    );
  } else {
    messages.push(
      { role: 'user' as const, content: '你好，我想学习日语', tokens: 12 },
      { role: 'assistant' as const, content: '你好！很高兴能帮助你学习日语。你想从哪个方面开始呢？', tokens: 50 },
      { role: 'user' as const, content: '我想了解一下动词变形', tokens: 15 },
      { role: 'assistant' as const, content: '日语动词变形是一个重要的语法点。日语动词主要分为三类：五段动词、一段动词和不规则动词...', tokens: 300 }
    );
  }

  return messages.map((msg) => ({
    id: uuidv4(),
    conversationId,
    ...msg,
    metadata: { model: 'claude-3-sonnet' },
  }));
}

// ============================================================================
// Seed 函数
// ============================================================================

async function seed() {
  console.log('🌱 开始播种数据...\n');

  try {
    // 1. 插入歌曲
    console.log('📀 插入歌曲数据...');
    await db.insert(schema.songs).values(mockSongs).onConflictDoNothing();
    console.log(`   ✓ 插入 ${mockSongs.length} 首歌曲\n`);

    // 2. 插入歌词
    console.log('📝 插入歌词数据...');
    let totalLines = 0;
    for (const song of mockSongs) {
      const linesData = mockLinesMap[song.title];
      if (linesData) {
        const lines = linesData.map((line, index) => ({
          id: uuidv4(),
          songId: song.id,
          lineNumber: index + 1,
          ...line,
        }));
        await db.insert(schema.lines).values(lines).onConflictDoNothing();
        totalLines += lines.length;
      }
    }
    console.log(`   ✓ 插入 ${totalLines} 行歌词\n`);

    // 3. 插入对话
    console.log('💬 插入对话数据...');
    const conversationsToInsert = mockConversations.map((conv) => ({
      ...conv,
      userId: MOCK_USER_ID,
      songId: mockSongs[0].id, // 关联到第一首歌
    }));
    await db.insert(schema.conversations).values(conversationsToInsert).onConflictDoNothing();
    console.log(`   ✓ 插入 ${mockConversations.length} 个对话\n`);

    // 4. 插入消息
    console.log('📨 插入消息数据...');
    let totalMessages = 0;
    for (const conv of mockConversations) {
      const messagesData = generateMockMessages(conv.id, conv.title);
      await db.insert(schema.messages).values(messagesData).onConflictDoNothing();
      totalMessages += messagesData.length;
    }
    console.log(`   ✓ 插入 ${totalMessages} 条消息\n`);

    console.log('✅ 数据播种完成！\n');
    console.log('📊 数据统计:');
    console.log(`   - 歌曲: ${mockSongs.length}`);
    console.log(`   - 歌词: ${totalLines}`);
    console.log(`   - 对话: ${mockConversations.length}`);
    console.log(`   - 消息: ${totalMessages}`);
    console.log(`\n🔑 Mock 用户 ID: ${MOCK_USER_ID}`);

  } catch (error) {
    console.error('❌ 播种数据时发生错误:', error);
    process.exit(1);
  }
}

// 运行 seed
seed();
