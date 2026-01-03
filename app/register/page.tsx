'use client';

/**
 * 注册页面
 *
 * 功能：
 * - 邮箱 + 密码注册
 * - 密码确认
 * - 表单验证
 * - 注册成功后直接登录并跳转首页
 *
 * 约束遵循 (real.md)：
 * - C3: 最小必要信息原则 - 仅收集邮箱和密码
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Music, Loader2, Eye, EyeOff, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { signUp } from '@/lib/auth/client';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 密码强度检查
  const passwordChecks = {
    length: password.length >= 6,
    match: password === confirmPassword && confirmPassword.length > 0,
  };

  const isPasswordValid = passwordChecks.length && passwordChecks.match;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 验证密码
    if (!passwordChecks.length) {
      setError('密码至少需要 6 个字符');
      return;
    }

    if (!passwordChecks.match) {
      setError('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUp.email({
        email,
        password,
        name: email.split('@')[0], // 使用邮箱前缀作为默认名称
      });

      if (result.error) {
        setError(result.error.message || '注册失败，请稍后重试');
        setIsLoading(false);
        return;
      }

      // 注册成功，直接跳转首页（Better Auth 会自动登录）
      router.push('/');
      router.refresh();
    } catch (err) {
      setError('注册时发生错误，请稍后重试');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Music className="w-6 h-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">创建账号</CardTitle>
          <CardDescription>
            注册后即可保存你的学习进度
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* 错误提示 */}
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* 邮箱输入 */}
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            {/* 密码输入 */}
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="至少 6 个字符"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* 确认密码 */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>

            {/* 密码强度提示 */}
            {password.length > 0 && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  {passwordChecks.length ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span
                    className={
                      passwordChecks.length
                        ? 'text-green-500'
                        : 'text-muted-foreground'
                    }
                  >
                    至少 6 个字符
                  </span>
                </div>
                {confirmPassword.length > 0 && (
                  <div className="flex items-center gap-2">
                    {passwordChecks.match ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-destructive" />
                    )}
                    <span
                      className={
                        passwordChecks.match
                          ? 'text-green-500'
                          : 'text-destructive'
                      }
                    >
                      密码一致
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !isPasswordValid}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  注册中...
                </>
              ) : (
                '注册'
              )}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              已有账号？{' '}
              <Link
                href="/login"
                className="text-primary hover:underline font-medium"
              >
                登录
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
