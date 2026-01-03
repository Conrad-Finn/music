/**
 * Better Auth 数据库 Schema
 *
 * 认证相关表定义：
 * - user: 用户表（包含 role 字段用于 RBAC）
 * - session: 会话表
 * - account: 账户表（用于邮箱密码认证）
 * - verification: 验证表（预留，当前不使用）
 *
 * RBAC 角色：
 * - guest: 游客（未注册用户）
 * - user: 普通用户
 * - admin: 管理员
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ============================================================================
// 枚举定义
// ============================================================================

/**
 * 用户角色枚举
 */
export const userRoleEnum = pgEnum('user_role', ['guest', 'user', 'admin']);

// ============================================================================
// Better Auth 核心表
// ============================================================================

/**
 * 用户表
 *
 * Better Auth 核心表，存储用户基本信息
 * 添加 role 字段用于 RBAC 权限控制
 */
export const user = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    // 用户名称（可选）
    name: text('name'),
    // 邮箱（必填，用于登录）
    email: text('email').notNull().unique(),
    // 邮箱验证状态（设置为 true，跳过验证）
    emailVerified: boolean('email_verified').default(true).notNull(),
    // 头像 URL（可选）
    image: text('image'),
    // 用户角色（RBAC）
    role: userRoleEnum('role').default('user').notNull(),
    // 创建时间
    createdAt: timestamp('created_at').defaultNow().notNull(),
    // 更新时间
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('user_email_idx').on(table.email),
    index('user_role_idx').on(table.role),
  ]
);

/**
 * 会话表
 *
 * 存储用户登录会话信息
 */
export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    // 过期时间
    expiresAt: timestamp('expires_at').notNull(),
    // 访问令牌
    token: text('token').notNull().unique(),
    // 创建时间
    createdAt: timestamp('created_at').defaultNow().notNull(),
    // 更新时间
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    // IP 地址
    ipAddress: text('ip_address'),
    // 用户代理
    userAgent: text('user_agent'),
    // 关联用户
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('session_user_id_idx').on(table.userId),
    index('session_token_idx').on(table.token),
  ]
);

/**
 * 账户表
 *
 * 存储认证账户信息（邮箱密码）
 */
export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    // 关联用户
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // 账户类型
    accountId: text('account_id').notNull(),
    // 认证提供者（credential = 邮箱密码）
    providerId: text('provider_id').notNull(),
    // 访问令牌（OAuth 用，邮箱密码认证不使用）
    accessToken: text('access_token'),
    // 刷新令牌（OAuth 用，邮箱密码认证不使用）
    refreshToken: text('refresh_token'),
    // 访问令牌过期时间
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    // 刷新令牌过期时间
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    // 授权范围
    scope: text('scope'),
    // 密码（仅邮箱密码认证使用，已加密）
    password: text('password'),
    // 创建时间
    createdAt: timestamp('created_at').defaultNow().notNull(),
    // 更新时间
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('account_user_id_idx').on(table.userId),
  ]
);

/**
 * 验证表
 *
 * 存储验证码/令牌（预留，当前不使用邮箱验证）
 */
export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    // 验证标识符
    identifier: text('identifier').notNull(),
    // 验证值
    value: text('value').notNull(),
    // 过期时间
    expiresAt: timestamp('expires_at').notNull(),
    // 创建时间
    createdAt: timestamp('created_at').defaultNow(),
    // 更新时间
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)]
);

// ============================================================================
// 类型导出
// ============================================================================

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;
