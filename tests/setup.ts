/**
 * 测试设置 - Neon 开发分支数据库隔离
 *
 * 使用 Neon Toolkit 创建临时测试数据库分支
 * 或使用 .env 中的 DATABASE_URL 连接开发分支数据库
 */

import { beforeAll, afterAll, vi } from 'vitest';
import { NeonToolkit } from '@neondatabase/toolkit';

// 测试数据库实例
let testDb: Awaited<ReturnType<NeonToolkit['createEphemeralDatabase']>> | null = null;

// 模拟 Next.js revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

/**
 * 全局测试设置
 */
beforeAll(async () => {
  const apiKey = process.env.NEON_API_KEY;

  if (apiKey) {
    try {
      console.log('Creating ephemeral test database...');
      const neon = new NeonToolkit({ apiKey });
      testDb = await neon.createEphemeralDatabase();
      process.env.DATABASE_URL = testDb.url;
      console.log('Ephemeral test database created successfully');
    } catch (error) {
      console.warn('Failed to create ephemeral database:', error);
      console.log('Falling back to .env DATABASE_URL');
    }
  } else {
    if (!process.env.DATABASE_URL) {
      console.warn('DATABASE_URL not found, some tests may fail');
    } else {
      console.log('Using database from .env (NEON_API_KEY not set for ephemeral DB)');
      console.log('Note: Tests with foreign key constraints may fail without a test user');
    }
  }
});

/**
 * 全局测试清理
 */
afterAll(async () => {
  if (testDb) {
    try {
      console.log('Cleaning up ephemeral test database...');
      await testDb.delete();
      console.log('Ephemeral test database deleted');
    } catch (error) {
      console.warn('Failed to delete ephemeral test database:', error);
    }
  }
  console.log('Test cleanup completed');
});
