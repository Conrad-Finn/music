/**
 * Better Auth 服务端配置
 *
 * 认证配置：
 * - 仅支持邮箱 + 密码登录（不需要 OAuth）
 * - 不需要邮箱验证（注册后直接登录）
 * - 不需要密码重置功能
 * - RBAC 模型：游客、普通用户、管理员
 *
 * 约束遵循 (real.md)：
 * - C2: 用户数据隔离 - 所有用户数据通过 userId 关联
 * - C3: 最小必要信息原则 - 仅收集邮箱和密码
 */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/db';
import * as authSchema from './schema';

/**
 * 用户角色类型
 */
export type UserRole = 'guest' | 'user' | 'admin';

/**
 * Better Auth 实例配置
 */
export const auth = betterAuth({
  // 数据库适配器
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: authSchema,
  }),

  // 邮箱密码认证配置
  emailAndPassword: {
    enabled: true,
    // 不需要邮箱验证
    requireEmailVerification: false,
    // 密码最小长度
    minPasswordLength: 6,
  },

  // 会话配置
  session: {
    // 会话有效期：7 天
    expiresIn: 60 * 60 * 24 * 7,
    // 自动刷新会话
    updateAge: 60 * 60 * 24,
    // Cookie 配置
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 分钟
    },
  },

  // 用户配置
  user: {
    // 额外字段
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'user',
        input: false, // 不允许用户在注册时设置
      },
    },
  },
});

/**
 * 导出认证类型
 */
export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
