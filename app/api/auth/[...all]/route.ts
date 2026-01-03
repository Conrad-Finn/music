/**
 * Better Auth API 路由处理器
 *
 * 处理所有认证相关的 API 请求：
 * - POST /api/auth/sign-up - 用户注册
 * - POST /api/auth/sign-in/email - 邮箱密码登录
 * - POST /api/auth/sign-out - 用户登出
 * - GET /api/auth/session - 获取当前会话
 */

import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

// 导出 GET 和 POST 处理器
export const { GET, POST } = toNextJsHandler(auth);
