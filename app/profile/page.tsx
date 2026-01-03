'use client'

import Link from 'next/link'
import { useAppStore } from '@/lib/stores/app-store'
import { useCardStore } from '@/lib/stores/card-store'
import { useSongStore } from '@/lib/stores/song-store'
import { useAuth } from '@/lib/auth/provider'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { User, Music, BookOpen, Moon, Sun, Info, LogOut, Shield } from 'lucide-react'
import { StorageManager } from '@/components/storage'

// 角色标签配置
const roleLabels = {
  guest: { label: '游客', className: 'bg-muted text-muted-foreground' },
  user: { label: '普通用户', className: 'bg-primary/10 text-primary' },
  admin: { label: '管理员', className: 'bg-amber-500/10 text-amber-500' },
}

export default function ProfilePage() {
  const { useMockMode, setMockMode, theme, setTheme } = useAppStore()
  const { getCardStats } = useCardStore()
  const { songs, getFavorites } = useSongStore()
  const { user, isAuthenticated, isLoading, signOut, isAdmin } = useAuth()

  const cardStats = getCardStats()
  const favoriteSongs = getFavorites()
  const roleConfig = roleLabels[user?.role || 'guest']

  return (
    <AppShell>
      <Header title="我的" showHome showUserMenu={false} />

      <ScrollArea className="h-[calc(100vh-56px-120px)]">
        <div className="p-4 space-y-4">
          {/* 用户信息卡片 */}
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
                  <div className="space-y-2 flex-1">
                    <div className="h-5 bg-muted animate-pulse rounded w-24" />
                    <div className="h-4 bg-muted animate-pulse rounded w-32" />
                  </div>
                </div>
              ) : isAuthenticated && user ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    {user.image ? (
                      <img
                        src={user.image}
                        alt={user.name || '用户头像'}
                        className="h-16 w-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-8 w-8 text-primary" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-lg font-semibold">{user.name || user.email.split('@')[0]}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <div className="mt-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${roleConfig.className}`}
                        >
                          {isAdmin && <Shield className="w-3 h-3" />}
                          {roleConfig.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full text-destructive hover:text-destructive"
                    onClick={signOut}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    退出登录
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">游客用户</p>
                      <p className="text-sm text-muted-foreground">登录后可同步学习进度</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/login" className="flex-1">
                      <Button variant="outline" className="w-full">
                        登录
                      </Button>
                    </Link>
                    <Link href="/register" className="flex-1">
                      <Button className="w-full">注册</Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 学习统计 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                学习统计
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{cardStats.total}</p>
                  <p className="text-xs text-muted-foreground">词卡总数</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-green-500">{cardStats.mastered}</p>
                  <p className="text-xs text-muted-foreground">已掌握</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-500">{cardStats.learning}</p>
                  <p className="text-xs text-muted-foreground">学习中</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-500">{cardStats.new}</p>
                  <p className="text-xs text-muted-foreground">新词</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 歌曲统计 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Music className="h-4 w-4" />
                歌曲统计
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold">{songs.length}</p>
                  <p className="text-xs text-muted-foreground">歌曲总数</p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold text-red-500">{favoriteSongs.length}</p>
                  <p className="text-xs text-muted-foreground">收藏</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mock 模式 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">演示模式</p>
                    <p className="text-xs text-muted-foreground">使用本地模拟数据</p>
                  </div>
                </div>
                <Switch checked={useMockMode} onCheckedChange={setMockMode} />
              </div>

              {/* 深色模式 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {theme === 'dark' ? (
                    <Moon className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Sun className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">深色模式</p>
                    <p className="text-xs text-muted-foreground">护眼夜间模式</p>
                  </div>
                </div>
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                />
              </div>
            </CardContent>
          </Card>

          {/* 本地存储管理 */}
          <StorageManager />

          {/* 关于 */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-sm text-muted-foreground">
                <p>听日文歌 v1.0.0</p>
                <p className="mt-1">听歌顺手一点点听懂</p>
                <Badge variant="secondary" className="mt-2">
                  演示版本
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* 底部留白 */}
          <div className="h-4" />
        </div>
      </ScrollArea>
    </AppShell>
  )
}
