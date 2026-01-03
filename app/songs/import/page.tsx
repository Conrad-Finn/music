'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { localAudioStorage, formatFileSize } from '@/lib/storage'
import { Music, Upload, X, Check, FileAudio } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImportResult {
  song: { id: string; title: string }
  lines: Array<{ id: string; contentJa: string; contentZh?: string }>
  cards: Array<{ lineId: string; cards: unknown[] }>
}

export default function ImportSongPage() {
  const router = useRouter()
  const audioInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [lyricsText, setLyricsText] = useState('')
  const [parseWithAI, setParseWithAI] = useState(true)
  const [generateCards, setGenerateCards] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  // 音频文件状态
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioDuration, setAudioDuration] = useState<number | null>(null)
  const [savingAudio, setSavingAudio] = useState(false)

  // 解析歌词文本为数组
  const parseLyrics = (text: string): string[] => {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('[')) // 过滤空行和时间戳行
  }

  const handleImport = async () => {
    // 验证
    if (!title.trim()) {
      setError('请输入歌曲标题')
      return
    }
    if (!lyricsText.trim()) {
      setError('请输入歌词')
      return
    }

    const lyrics = parseLyrics(lyricsText)
    if (lyrics.length === 0) {
      setError('歌词内容无效')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/songs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          artist: artist.trim() || undefined,
          lyrics,
          duration: audioDuration ? Math.round(audioDuration) : undefined,
          options: {
            parseWithAI,
            generateCards,
            cardsPerLine: 1,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '导入失败')
      }

      // 如果有音频文件，保存到本地存储
      if (audioFile && data.data?.song?.id) {
        setSavingAudio(true)
        try {
          await localAudioStorage.saveAudio(data.data.song.id, audioFile)
        } catch (audioError) {
          console.error('Failed to save audio:', audioError)
          // 不阻止整体导入成功
        }
        setSavingAudio(false)
      }

      setResult(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败')
    } finally {
      setIsLoading(false)
      setSavingAudio(false)
    }
  }

  // 从文件读取歌词
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setLyricsText(text)

      // 尝试从文件名提取歌曲名
      const fileName = file.name.replace(/\.(txt|lrc)$/i, '')
      if (!title) {
        setTitle(fileName)
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  // 处理音频文件上传
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith('audio/')) {
      setError('请选择有效的音频文件')
      return
    }

    // 验证文件大小（最大 50MB）
    if (file.size > 50 * 1024 * 1024) {
      setError('音频文件不能超过 50MB')
      return
    }

    setAudioFile(file)
    setError(null)

    // 获取音频时长
    const audio = new Audio()
    const url = URL.createObjectURL(file)
    audio.addEventListener('loadedmetadata', () => {
      setAudioDuration(audio.duration)
      URL.revokeObjectURL(url)
    })
    audio.src = url

    // 从音频文件名提取歌曲名
    if (!title) {
      const fileName = file.name.replace(/\.(mp3|m4a|wav|flac|ogg|aac)$/i, '')
      setTitle(fileName)
    }
  }

  // 移除音频文件
  const handleRemoveAudio = () => {
    setAudioFile(null)
    setAudioDuration(null)
    if (audioInputRef.current) {
      audioInputRef.current.value = ''
    }
  }

  // 格式化时长
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <AppShell>
      <Header title="导入歌曲" showBack showHome />

      <ScrollArea className="h-[calc(100vh-56px-120px)]">
        <div className="p-4 space-y-6">
          {/* 成功结果 */}
          {result && (
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <Check className="h-5 w-5 text-green-600" />
                <h3 className="font-medium text-green-800 dark:text-green-200">
                  导入成功！
                </h3>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                歌曲：{result.song.title}
                <br />
                歌词行数：{result.lines.length}
                <br />
                生成词卡：{result.cards.reduce((sum, c) => sum + c.cards.length, 0)} 个
                {audioFile && (
                  <>
                    <br />
                    <span className="inline-flex items-center gap-1">
                      <Music className="h-3 w-3" />
                      音频已保存到本地
                    </span>
                  </>
                )}
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => router.push(`/songs/${result.song.id}`)}>
                  查看歌曲
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setResult(null)
                    setTitle('')
                    setArtist('')
                    setLyricsText('')
                    setAudioFile(null)
                    setAudioDuration(null)
                  }}
                >
                  继续导入
                </Button>
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* 歌曲信息 */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">歌曲标题 *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：Lemon"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="artist">艺术家</Label>
              <Input
                id="artist"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="例如：米津玄師"
                className="mt-1"
              />
            </div>
          </div>

          {/* 音频文件上传 */}
          <div>
            <Label>音频文件（可选）</Label>
            <p className="text-xs text-muted-foreground mb-2">
              上传音频文件后可离线播放
            </p>

            {audioFile ? (
              // 已选择音频文件
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileAudio className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{audioFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(audioFile.size)}
                    {audioDuration && ` · ${formatDuration(audioDuration)}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0"
                  onClick={handleRemoveAudio}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              // 上传区域
              <label
                className={cn(
                  'flex flex-col items-center justify-center gap-2',
                  'p-6 border-2 border-dashed rounded-lg cursor-pointer',
                  'hover:bg-muted/50 hover:border-primary/50 transition-colors'
                )}
              >
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  className="hidden"
                />
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">点击上传音频文件</p>
                  <p className="text-xs text-muted-foreground">
                    支持 MP3, M4A, WAV, FLAC 等格式（最大 50MB）
                  </p>
                </div>
              </label>
            )}
          </div>

          {/* 歌词输入 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="lyrics">歌词 *</Label>
              <label className="text-sm text-primary cursor-pointer hover:underline">
                <input
                  type="file"
                  accept=".txt,.lrc"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                从文件导入
              </label>
            </div>
            <textarea
              id="lyrics"
              value={lyricsText}
              onChange={(e) => setLyricsText(e.target.value)}
              placeholder={`粘贴日文歌词，每行一句：

夢ならばどれほどよかったでしょう
未だにあなたのことを夢にみる
忘れたものを取りに帰るように
古びた思い出の埃を払う`}
              className="w-full h-64 p-3 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">
              已输入 {parseLyrics(lyricsText).length} 行歌词
            </p>
          </div>

          {/* AI 选项 */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-medium">AI 处理选项</h3>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="parseWithAI">AI 解析歌词</Label>
                <p className="text-xs text-muted-foreground">
                  自动添加假名注音和中文翻译
                </p>
              </div>
              <Switch
                id="parseWithAI"
                checked={parseWithAI}
                onCheckedChange={setParseWithAI}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="generateCards">自动生成词卡</Label>
                <p className="text-xs text-muted-foreground">
                  从每句歌词提取学习词汇
                </p>
              </div>
              <Switch
                id="generateCards"
                checked={generateCards}
                onCheckedChange={setGenerateCards}
              />
            </div>
          </div>

          {/* 提交按钮 */}
          <Button
            className="w-full"
            onClick={handleImport}
            disabled={isLoading || savingAudio || !title.trim() || !lyricsText.trim()}
          >
            {savingAudio
              ? '保存音频中...'
              : isLoading
                ? '导入中...'
                : audioFile
                  ? '导入歌曲和音频'
                  : '导入歌曲'}
          </Button>

          {/* 说明 */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>* 歌词将保存到数据库，可在歌曲详情页查看</p>
            <p>* AI 解析需要网络连接，可能需要几秒钟</p>
            <p>* 支持 .txt 和 .lrc 格式的歌词文件</p>
            <p>* 音频文件保存在本地浏览器，可离线播放</p>
          </div>
        </div>
      </ScrollArea>
    </AppShell>
  )
}
