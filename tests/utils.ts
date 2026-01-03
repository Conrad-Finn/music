/**
 * 测试工具函数
 *
 * 提供测试所需的辅助函数
 */

import { db } from '@/db';
import { sql } from 'drizzle-orm';

/**
 * 获取数据库中的第一个用户 ID
 * 用于测试需要 userId 的场景
 */
export async function getTestUserId(): Promise<string | null> {
  try {
    // 查询 neon_auth.user 表获取第一个用户
    const result = await db.execute<{ id: string }>(
      sql`SELECT id FROM neon_auth.user LIMIT 1`
    );

    if (result.rows && result.rows.length > 0) {
      return result.rows[0].id;
    }

    return null;
  } catch (error) {
    console.warn('Failed to get test user:', error);
    return null;
  }
}

/**
 * 检查是否可以运行需要用户的测试
 */
export async function canRunUserTests(): Promise<boolean> {
  const userId = await getTestUserId();
  return userId !== null;
}
