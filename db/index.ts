/**
 * 数据库连接 - Neon Serverless PostgreSQL
 *
 * 使用 Neon Serverless Driver 连接 Neon 数据库
 * 支持 Edge Runtime 和 Serverless 环境
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import * as authSchema from '@/lib/auth/schema';

// 创建 Neon SQL 客户端
const sql = neon(process.env.DATABASE_URL!);

// 创建 Drizzle ORM 实例（合并业务 schema 和认证 schema）
export const db = drizzle(sql, {
  schema: { ...schema, ...authSchema },
});

// 导出 schema 以便在其他地方使用
export { schema, authSchema };

// 导出类型
export type Database = typeof db;
