/**
 * Conversation Server Actions 测试 - 听日文歌项目
 *
 * 测试 conversation.actions.ts 中的 CRUD 操作
 * 使用 bun 直接调用数据库测试
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '@/db';
import { conversations, messages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  getConversations,
  getConversationById,
  createConversation,
  updateConversation,
  deleteConversation,
  getMessages,
  addMessage,
  addMessages,
  deleteMessage,
} from '@/app/actions/conversation.actions';
import { getTestUserId } from '../utils';

// 动态获取的测试用户 ID
let TEST_USER_ID: string | null = null;

describe('Conversation Server Actions', () => {
  // 存储测试中创建的 IDs，用于清理
  const createdConversationIds: string[] = [];

  beforeAll(async () => {
    // 获取真实的测试用户 ID
    TEST_USER_ID = await getTestUserId();

    if (!TEST_USER_ID) {
      console.warn('No test user found in database, some tests will be skipped');
      return;
    }

    // 清理之前的测试数据
    await db.delete(conversations).where(eq(conversations.userId, TEST_USER_ID));
  });

  afterAll(async () => {
    // 清理所有测试数据
    for (const id of createdConversationIds) {
      await db.delete(conversations).where(eq(conversations.id, id)).catch(() => {});
    }
  });

  describe('createConversation', () => {
    it('应成功创建对话', async () => {
      if (!TEST_USER_ID) {
        console.log('Skipping: No test user available');
        return;
      }

      const result = await createConversation({
        userId: TEST_USER_ID,
        title: '创建测试对话',
        summary: '这是一个测试',
        songId: null,
        metadata: { purpose: 'chat' },
      });

      createdConversationIds.push(result.id);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBe('创建测试对话');
      expect(result.summary).toBe('这是一个测试');
      expect(result.userId).toBe(TEST_USER_ID);
    });

    it('应设置默认时间戳', async () => {
      if (!TEST_USER_ID) {
        console.log('Skipping: No test user available');
        return;
      }

      const result = await createConversation({
        userId: TEST_USER_ID,
        title: '时间戳测试',
      });

      createdConversationIds.push(result.id);

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('getConversations', () => {
    beforeEach(async () => {
      if (!TEST_USER_ID) return;

      // 创建多个测试对话用于分页测试
      const testData = [
        { userId: TEST_USER_ID, title: '对话 A', summary: '关于语法' },
        { userId: TEST_USER_ID, title: '对话 B', summary: '关于词汇' },
        { userId: TEST_USER_ID, title: '对话 C', summary: '关于歌词' },
        { userId: TEST_USER_ID, title: '对话 D', summary: '关于发音' },
        { userId: TEST_USER_ID, title: '对话 E', summary: '关于文化' },
      ];

      for (const data of testData) {
        const [created] = await db.insert(conversations).values(data).returning();
        createdConversationIds.push(created.id);
      }
    });

    it('应返回用户的对话列表', async () => {
      if (!TEST_USER_ID) {
        console.log('Skipping: No test user available');
        return;
      }

      const result = await getConversations({ userId: TEST_USER_ID });

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it('应支持分页', async () => {
      if (!TEST_USER_ID) {
        console.log('Skipping: No test user available');
        return;
      }

      const result = await getConversations({
        userId: TEST_USER_ID,
        page: 1,
        limit: 2,
      });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.data.length).toBeLessThanOrEqual(2);
      expect(result.totalPages).toBeGreaterThan(0);
    });

    it('应支持搜索', async () => {
      if (!TEST_USER_ID) {
        console.log('Skipping: No test user available');
        return;
      }

      const result = await getConversations({
        userId: TEST_USER_ID,
        q: '语法',
      });

      // 如果有匹配结果，应包含搜索关键词
      if (result.data.length > 0) {
        const hasMatch = result.data.some(
          (c) => c.title.includes('语法') || (c.summary && c.summary.includes('语法'))
        );
        expect(hasMatch).toBe(true);
      }
    });

    it('不应返回其他用户的对话', async () => {
      const otherUserId = '00000000-0000-0000-0000-000000000099';
      const result = await getConversations({ userId: otherUserId });

      // 其他用户应该没有对话（因为我们只创建了 TEST_USER_ID 的数据）
      expect(result.data.length).toBe(0);
    });
  });

  describe('getConversationById', () => {
    let testConversationId: string;

    beforeAll(async () => {
      if (!TEST_USER_ID) return;

      const [conv] = await db
        .insert(conversations)
        .values({
          userId: TEST_USER_ID,
          title: '单个对话测试',
          summary: '用于 getById 测试',
        })
        .returning();

      testConversationId = conv.id;
      createdConversationIds.push(testConversationId);

      // 添加消息
      await db.insert(messages).values([
        { conversationId: testConversationId, role: 'user', content: '用户消息' },
        { conversationId: testConversationId, role: 'assistant', content: '助手回复' },
      ]);
    });

    it('应返回对话详情', async () => {
      if (!TEST_USER_ID || !testConversationId) {
        console.log('Skipping: No test data available');
        return;
      }

      const result = await getConversationById(testConversationId);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(testConversationId);
      expect(result!.title).toBe('单个对话测试');
    });

    it('应支持包含消息', async () => {
      if (!TEST_USER_ID || !testConversationId) {
        console.log('Skipping: No test data available');
        return;
      }

      const result = await getConversationById(testConversationId, {
        includeMessages: true,
      });

      expect(result).not.toBeNull();
      expect(result!.messages).toBeDefined();
      expect(result!.messages!.length).toBe(2);
    });

    it('不存在的对话应返回null', async () => {
      const result = await getConversationById('00000000-0000-0000-0000-000000000000');

      expect(result).toBeNull();
    });
  });

  describe('updateConversation', () => {
    let testConversationId: string;

    beforeEach(async () => {
      if (!TEST_USER_ID) return;

      const [conv] = await db
        .insert(conversations)
        .values({
          userId: TEST_USER_ID,
          title: '更新前标题',
          summary: '更新前摘要',
        })
        .returning();

      testConversationId = conv.id;
      createdConversationIds.push(testConversationId);
    });

    it('应成功更新对话标题', async () => {
      if (!TEST_USER_ID || !testConversationId) {
        console.log('Skipping: No test data available');
        return;
      }

      const result = await updateConversation(testConversationId, {
        title: '更新后标题',
      });

      expect(result).not.toBeNull();
      expect(result!.title).toBe('更新后标题');
      expect(result!.summary).toBe('更新前摘要'); // 未更新的字段保持不变
    });

    it('应更新 updatedAt 时间戳', async () => {
      if (!TEST_USER_ID || !testConversationId) {
        console.log('Skipping: No test data available');
        return;
      }

      const before = await getConversationById(testConversationId);
      const beforeTime = before!.updatedAt.getTime();

      // 等待一小段时间确保时间戳不同
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await updateConversation(testConversationId, {
        title: '新标题',
      });

      expect(result!.updatedAt.getTime()).toBeGreaterThan(beforeTime);
    });

    it('更新不存在的对话应返回null', async () => {
      const result = await updateConversation('00000000-0000-0000-0000-000000000000', {
        title: '不存在',
      });

      expect(result).toBeNull();
    });
  });

  describe('deleteConversation', () => {
    it('应成功删除对话', async () => {
      if (!TEST_USER_ID) {
        console.log('Skipping: No test user available');
        return;
      }

      const [conv] = await db
        .insert(conversations)
        .values({
          userId: TEST_USER_ID,
          title: '待删除对话',
        })
        .returning();

      const result = await deleteConversation(conv.id);

      expect(result).toBe(true);

      // 验证已删除
      const deleted = await getConversationById(conv.id);
      expect(deleted).toBeNull();
    });

    it('删除不存在的对话应返回false', async () => {
      const result = await deleteConversation('00000000-0000-0000-0000-000000000000');

      expect(result).toBe(false);
    });

    it('删除对话应级联删除消息', async () => {
      if (!TEST_USER_ID) {
        console.log('Skipping: No test user available');
        return;
      }

      // 创建对话和消息
      const [conv] = await db
        .insert(conversations)
        .values({
          userId: TEST_USER_ID,
          title: '带消息的对话',
        })
        .returning();

      await db.insert(messages).values([
        { conversationId: conv.id, role: 'user', content: '测试消息' },
      ]);

      // 删除对话
      await deleteConversation(conv.id);

      // 验证消息也被删除
      const remainingMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conv.id));

      expect(remainingMessages.length).toBe(0);
    });
  });
});

describe('Message Server Actions', () => {
  let TEST_USER_ID: string | null = null;
  let testConversationId: string;

  beforeAll(async () => {
    TEST_USER_ID = await getTestUserId();

    if (!TEST_USER_ID) {
      console.warn('No test user found, Message tests will be skipped');
      return;
    }

    // 创建测试对话
    const [conv] = await db
      .insert(conversations)
      .values({
        userId: TEST_USER_ID,
        title: '消息测试对话',
      })
      .returning();

    testConversationId = conv.id;
  });

  afterAll(async () => {
    // 清理测试数据
    if (testConversationId) {
      await db.delete(conversations).where(eq(conversations.id, testConversationId)).catch(() => {});
    }
  });

  describe('addMessage', () => {
    it('应成功添加消息', async () => {
      if (!TEST_USER_ID || !testConversationId) {
        console.log('Skipping: No test data available');
        return;
      }

      const result = await addMessage({
        conversationId: testConversationId,
        role: 'user',
        content: '新消息内容',
        tokens: 10,
        metadata: null,
      });

      expect(result).toBeDefined();
      expect(result.content).toBe('新消息内容');
      expect(result.role).toBe('user');
    });

    it('应更新对话的 updatedAt', async () => {
      if (!TEST_USER_ID || !testConversationId) {
        console.log('Skipping: No test data available');
        return;
      }

      const convBefore = await getConversationById(testConversationId);
      const beforeTime = convBefore!.updatedAt.getTime();

      await new Promise((resolve) => setTimeout(resolve, 100));

      await addMessage({
        conversationId: testConversationId,
        role: 'assistant',
        content: '助手回复',
        tokens: null,
        metadata: null,
      });

      const convAfter = await getConversationById(testConversationId);
      expect(convAfter!.updatedAt.getTime()).toBeGreaterThan(beforeTime);
    });
  });

  describe('addMessages (批量)', () => {
    it('应成功批量添加消息', async () => {
      if (!TEST_USER_ID || !testConversationId) {
        console.log('Skipping: No test data available');
        return;
      }

      const result = await addMessages(testConversationId, [
        { role: 'user', content: '批量消息1', tokens: null, metadata: null },
        { role: 'assistant', content: '批量消息2', tokens: null, metadata: null },
      ]);

      expect(result.length).toBe(2);
      expect(result[0].content).toBe('批量消息1');
      expect(result[1].content).toBe('批量消息2');
    });
  });

  describe('getMessages', () => {
    it('应返回对话的所有消息', async () => {
      if (!TEST_USER_ID || !testConversationId) {
        console.log('Skipping: No test data available');
        return;
      }

      const result = await getMessages(testConversationId);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('应按创建时间排序', async () => {
      if (!TEST_USER_ID || !testConversationId) {
        console.log('Skipping: No test data available');
        return;
      }

      const result = await getMessages(testConversationId);

      if (result.length > 1) {
        for (let i = 0; i < result.length - 1; i++) {
          expect(result[i].createdAt.getTime()).toBeLessThanOrEqual(
            result[i + 1].createdAt.getTime()
          );
        }
      }
    });
  });

  describe('deleteMessage', () => {
    it('应成功删除消息', async () => {
      if (!TEST_USER_ID || !testConversationId) {
        console.log('Skipping: No test data available');
        return;
      }

      const [msg] = await db
        .insert(messages)
        .values({
          conversationId: testConversationId,
          role: 'user',
          content: '待删除消息',
        })
        .returning();

      const result = await deleteMessage(msg.id);

      expect(result).toBe(true);
    });

    it('删除不存在的消息应返回false', async () => {
      const result = await deleteMessage('00000000-0000-0000-0000-000000000000');

      expect(result).toBe(false);
    });
  });
});
