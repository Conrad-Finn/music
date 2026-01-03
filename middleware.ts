/**
 * Next.js 中间件 - 认证保护
 *
 * 功能：
 * - 检查用户认证状态
 * - 保护需要登录的路由
 * - 自动重定向到登录页
 *
 * RBAC 角色：
 * - guest: 游客（未登录）
 * - user: 普通用户
 * - admin: 管理员
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 需要登录才能访问的路由
const protectedRoutes = [
  '/profile',
  '/cards',
  '/favorites',
  '/learn',
];

// 仅管理员可访问的路由
const adminRoutes = [
  '/admin',
];

// 已登录用户不应访问的路由（如登录/注册页）
const authRoutes = [
  '/login',
  '/register',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 获取 Better Auth 会话 cookie
  const sessionCookie = request.cookies.get('better-auth.session_token');
  const isAuthenticated = !!sessionCookie?.value;

  // 检查是否是认证相关路由
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));

  // 如果已登录用户访问登录/注册页，重定向到首页
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 如果未登录用户访问受保护路由，重定向到登录页
  if (!isAuthenticated && isProtectedRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 管理员路由需要额外验证（在页面级别进行）
  // 这里仅检查是否登录
  if (!isAuthenticated && isAdminRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径除了：
     * - api 路由（/api/...）
     * - 静态文件（_next/static, favicon.ico 等）
     * - 图片（.png, .jpg 等）
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
};
