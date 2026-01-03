/**
 * 测试设置
 *
 * 使用 .env 中的 DATABASE_URL 连接数据库
 */

import { beforeAll, afterAll, vi } from 'vitest';

// 模拟 Next.js revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

/**
 * 全局测试设置
 */
beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL not found, some tests may fail');
  } else {
    console.log('Using database from .env');
  }
});

/**
 * 全局测试清理
 */
afterAll(async () => {
  console.log('Test cleanup completed');
});
