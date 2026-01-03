/**
 * Drizzle ORM 配置
 *
 * 用于数据库迁移和 Drizzle Studio
 */

import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// 显式加载 .env 文件
config({ path: '.env' });

export default defineConfig({
  // Schema 文件位置（包含业务 schema 和认证 schema）
  schema: ['./db/schema.ts', './lib/auth/schema.ts'],
  // 迁移文件输出目录
  out: './db/migrations',
  // 数据库方言
  dialect: 'postgresql',
  // 数据库连接配置
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // 开启详细日志
  verbose: true,
  // 开启严格模式
  strict: true,
});
