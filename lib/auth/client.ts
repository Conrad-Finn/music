/**
 * Better Auth 客户端配置
 *
 * 用于前端组件中的认证操作：
 * - signUp: 用户注册
 * - signIn: 用户登录
 * - signOut: 用户登出
 * - useSession: 获取当前会话
 */

import { createAuthClient } from 'better-auth/react';

/**
 * 认证客户端实例
 */
export const authClient = createAuthClient({
  // 基础 URL，默认使用当前域名
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
});

/**
 * 导出常用方法
 */
export const {
  signUp,
  signIn,
  signOut,
  useSession,
  getSession,
} = authClient;

/**
 * 用户角色类型
 */
export type UserRole = 'guest' | 'user' | 'admin';

/**
 * 检查用户是否具有指定角色
 */
export function hasRole(
  session: ReturnType<typeof useSession>['data'],
  requiredRole: UserRole
): boolean {
  if (!session?.user) return false;

  const userRole = (session.user as { role?: UserRole }).role || 'user';

  // 权限等级：admin > user > guest
  const roleHierarchy: Record<UserRole, number> = {
    guest: 0,
    user: 1,
    admin: 2,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * 检查用户是否为管理员
 */
export function isAdmin(
  session: ReturnType<typeof useSession>['data']
): boolean {
  return hasRole(session, 'admin');
}
