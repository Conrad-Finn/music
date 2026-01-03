'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { localAudioStorage, formatFileSize } from '@/lib/storage'
import type { AudioMetadata } from '@/lib/storage'
import { HardDrive, Trash2, Music, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StorageManagerProps {
  className?: string
}

export function StorageManager({ className }: StorageManagerProps) {
  const [audioFiles, setAudioFiles] = useState<AudioMetadata[]>([])
  const [storageUsage, setStorageUsage] = useState({ used: 0, count: 0 })
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showConfirmClear, setShowConfirmClear] = useState(false)

  // 加载存储数据
  const loadStorageData = async () => {
    try {
      const [files, usage] = await Promise.all([
        localAudioStorage.getAllMetadata(),
        localAudioStorage.getStorageUsage(),
      ])
      setAudioFiles(files.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ))
      setStorageUsage(usage)
    } catch (err) {
      console.error('Failed to load storage data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStorageData()
  }, [])

  // 删除单个音频
  const handleDelete = async (songId: string) => {
    setDeleting(songId)
    try {
      await localAudioStorage.deleteAudio(songId)
      await loadStorageData()
    } catch (err) {
      console.error('Failed to delete audio:', err)
    } finally {
      setDeleting(null)
    }
  }

  // 清空所有音频
  const handleClearAll = async () => {
    try {
      await localAudioStorage.clearAll()
      await loadStorageData()
      setShowConfirmClear(false)
    } catch (err) {
      console.error('Failed to clear storage:', err)
    }
  }

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // 格式化时长
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            本地存储
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">加载中...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          本地存储
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 存储统计 */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm font-medium">
              {storageUsage.count} 首歌曲
            </p>
            <p className="text-xs text-muted-foreground">
              已使用 {formatFileSize(storageUsage.used)}
            </p>
          </div>
          {storageUsage.count > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setShowConfirmClear(true)}
            >
              清空全部
            </Button>
          )}
        </div>

        {/* 确认清空对话框 */}
        {showConfirmClear && (
          <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">确定要清空所有本地音频吗？</p>
                <p className="text-xs text-muted-foreground mt-1">
                  此操作不可撤销，歌曲信息不会被删除
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleClearAll}
                  >
                    确认清空
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowConfirmClear(false)}
                  >
                    取消
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 音频文件列表 */}
        {audioFiles.length === 0 ? (
          <div className="text-center py-6">
            <Music className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">暂无本地音频</p>
            <p className="text-xs text-muted-foreground mt-1">
              导入歌曲时上传音频文件即可离线播放
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {audioFiles.map((file) => (
              <div
                key={file.id}
                className={cn(
                  'flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors',
                  deleting === file.songId && 'opacity-50'
                )}
              >
                <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Music className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)} · {formatDuration(file.duration)} · {formatDate(file.createdAt)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(file.songId)}
                  disabled={deleting === file.songId}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
