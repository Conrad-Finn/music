'use client'

import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/stores/app-store'

export function MockModeIndicator() {
  const { useMockMode } = useAppStore()

  if (!useMockMode) return null

  return (
    <Badge
      variant="secondary"
      className="fixed top-2 right-2 z-50 text-xs opacity-70"
    >
      演示模式
    </Badge>
  )
}
