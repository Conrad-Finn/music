'use client';

/**
 * 用户菜单组件
 *
 * 显示用户认证状态：
 * - 未登录：显示登录/注册按钮
 * - 已登录：显示用户头像和下拉菜单
 */

import { useState } from 'react';
import Link from 'next/link';
import { User, LogOut, Settings, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, type UserRole } from '@/lib/auth/provider';

/**
 * 角色标签配置
 */
const roleLabels: Record<UserRole, { label: string; className: string }> = {
  guest: { label: '游客', className: 'bg-muted text-muted-foreground' },
  user: { label: '用户', className: 'bg-primary/10 text-primary' },
  admin: { label: '管理员', className: 'bg-amber-500/10 text-amber-500' },
};

export function UserMenu() {
  const { user, isAuthenticated, isLoading, signOut, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // 加载中状态
  if (isLoading) {
    return (
      <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
    );
  }

  // 未登录状态
  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login">
          <Button variant="ghost" size="sm">
            登录
          </Button>
        </Link>
        <Link href="/register">
          <Button size="sm">注册</Button>
        </Link>
      </div>
    );
  }

  // 已登录状态
  const roleConfig = roleLabels[user?.role || 'user'];

  return (
    <div className="relative">
      {/* 用户头像按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-muted transition-colors"
      >
        {user?.image ? (
          <img
            src={user.image}
            alt={user.name || '用户头像'}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
        )}
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <>
          {/* 点击外部关闭 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 top-full mt-2 w-56 bg-popover border rounded-lg shadow-lg z-50">
            {/* 用户信息 */}
            <div className="p-3 border-b">
              <div className="flex items-center gap-3">
                {user?.image ? (
                  <img
                    src={user.image}
                    alt={user.name || '用户头像'}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {user?.name || user?.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              {/* 角色标签 */}
              <div className="mt-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${roleConfig.className}`}
                >
                  {isAdmin && <Shield className="w-3 h-3" />}
                  {roleConfig.label}
                </span>
              </div>
            </div>

            {/* 菜单项 */}
            <div className="p-1">
              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
              >
                <Settings className="w-4 h-4" />
                个人设置
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  管理后台
                </Link>
              )}

              <button
                onClick={() => {
                  setIsOpen(false);
                  signOut();
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-destructive"
              >
                <LogOut className="w-4 h-4" />
                退出登录
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
