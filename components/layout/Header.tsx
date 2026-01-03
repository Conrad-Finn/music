'use client'

import { ArrowLeft, Home, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { UserMenu } from '@/components/auth/UserMenu'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title: string
  showBack?: boolean
  showHome?: boolean
  showSettings?: boolean
  showUserMenu?: boolean
  onSettingsClick?: () => void
  className?: string
  rightContent?: React.ReactNode
}

export function Header({
  title,
  showBack = false,
  showHome = false,
  showSettings = false,
  showUserMenu = true,
  onSettingsClick,
  className,
  rightContent,
}: HeaderProps) {
  const router = useRouter()

  return (
    <header
      className={cn(
        'sticky top-0 z-40',
        'flex items-center justify-between h-14 px-4',
        'bg-background/95 backdrop-blur-md border-b',
        className
      )}
    >
      {/* 左侧：返回/主页按钮 */}
      <div className="flex items-center gap-1 min-w-[60px]">
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            aria-label="返回"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        {showHome && (
          <Button
            variant="ghost"
            size="icon"
            asChild
            aria-label="返回首页"
          >
            <Link href="/">
              <Home className="h-5 w-5" />
            </Link>
          </Button>
        )}
      </div>

      {/* 中间：标题 */}
      <h1 className="text-lg font-semibold truncate flex-1 text-center">{title}</h1>

      {/* 右侧：操作按钮 */}
      <div className="flex items-center gap-2 min-w-[60px] justify-end">
        {rightContent}
        {showSettings && !rightContent && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettingsClick}
            aria-label="设置"
          >
            <Settings className="h-5 w-5" />
          </Button>
        )}
        {showUserMenu && <UserMenu />}
      </div>
    </header>
  )
}
