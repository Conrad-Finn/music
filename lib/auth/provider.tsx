'use client';

/**
 * 认证上下文提供者
 *
 * 提供认证状态给整个应用：
 * - 当前用户信息
 * - 登录/登出方法
 * - 角色检查工具
 */

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import { useSession, signOut as authSignOut } from '@/lib/auth/client';

// 用户角色类型
export type UserRole = 'guest' | 'user' | 'admin';

// 用户信息类型
export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: UserRole;
}

// 认证上下文类型
interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  hasRole: (requiredRole: UserRole) => boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * 认证上下文提供者组件
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();

  const user: AuthUser | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        role: ((session.user as { role?: UserRole }).role || 'user') as UserRole,
      }
    : null;

  const hasRole = (requiredRole: UserRole): boolean => {
    if (!user) return false;

    const roleHierarchy: Record<UserRole, number> = {
      guest: 0,
      user: 1,
      admin: 2,
    };

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  };

  const handleSignOut = async () => {
    await authSignOut();
    // 刷新页面以清除状态
    window.location.href = '/';
  };

  const value: AuthContextType = {
    user,
    isLoading: isPending,
    isAuthenticated: !!user,
    signOut: handleSignOut,
    hasRole,
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * 使用认证上下文的 Hook
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * 角色守卫组件
 *
 * 用于保护需要特定角色的内容
 */
export function RoleGuard({
  children,
  requiredRole = 'user',
  fallback = null,
}: {
  children: ReactNode;
  requiredRole?: UserRole;
  fallback?: ReactNode;
}) {
  const { hasRole, isLoading } = useAuth();

  if (isLoading) {
    return null; // 或返回加载状态
  }

  if (!hasRole(requiredRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * 管理员守卫组件
 */
export function AdminGuard({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <RoleGuard requiredRole="admin" fallback={fallback}>
      {children}
    </RoleGuard>
  );
}
