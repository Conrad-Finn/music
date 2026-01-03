/**
 * Vitest 配置 - 听日文歌项目
 *
 * 配置单元测试和集成测试
 * 使用 Neon 开发分支进行数据库隔离
 */

import { defineConfig } from 'vitest/config';
import path from 'path';
import dotenv from 'dotenv';

// 加载 .env 文件
dotenv.config();

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['app/**/*.ts', 'db/**/*.ts'],
      exclude: ['node_modules', 'tests'],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
