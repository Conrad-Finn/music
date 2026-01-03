# 听日文歌项目 (JP Songs Learning)

> 面向「日语 0 基础但长期听日文歌」人群，通过增强播放器 + 轻量词卡，让用户在听歌中逐步学会几个词。

## 技术栈

Next.js 15 + TypeScript + Tailwind + shadcn/ui + Drizzle ORM + Neon PostgreSQL + Better Auth + Vercel AI SDK + Bun

## 目录结构

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   ├── songs/[id]/        # 歌曲详情页
│   ├── cards/             # 词卡页
│   └── profile/           # 用户页
├── components/
│   ├── ui/                # shadcn 基础组件
│   ├── player/            # 播放器组件
│   ├── lyrics/            # 歌词组件
│   ├── cards/             # 词卡组件
│   └── layout/            # 布局组件
├── lib/
│   ├── stores/            # Zustand 状态管理
│   ├── hooks/             # 自定义 Hooks
│   ├── auth/              # 认证相关
│   └── storage.ts         # IndexedDB 本地存储
├── db/
│   ├── schema.ts          # Drizzle 表定义
│   └── index.ts           # 数据库连接
├── data/mock/             # Mock 数据（开发用）
├── types/index.ts         # TypeScript 类型
└── public/mock/audio/     # 本地测试音频
```

## 数据库表结构

| 表名 | 用途 | 关键字段 |
|-----|------|---------|
| `user` | Better Auth 用户 | id(text), email, name |
| `user_profiles` | 用户扩展信息 | userId, preferences(jsonb) |
| `songs` | 歌曲元数据 | title, artist, duration, coverUrl, source |
| `lines` | 歌词句子 | songId, lineNumber, contentJa, contentZh, furigana(jsonb), startTime, endTime |
| `cards` | 学习词卡 | lineId, word, reading, meaning, partOfSpeech |
| `favorites` | 用户收藏 | userId, lineId |
| `card_progress` | 学习进度 | userId, cardId, status(new/learning/mastered) |
| `sessions` | 学习会话 | userId, songId, mode, interactions(jsonb) |
| `conversations` | AI 对话 | userId, title, songId |
| `messages` | 对话消息 | conversationId, role, content |

## 核心 API 路由

```
GET/POST /api/songs              # 歌曲列表/创建
GET      /api/songs/[id]         # 歌曲详情
POST     /api/songs/import       # 导入歌曲
POST     /api/songs/parse-lyrics # AI 解析歌词
GET      /api/songs/[id]/lines   # 获取歌词
GET      /api/songs/[id]/cards   # 获取词卡
GET/POST /api/cards              # 词卡列表/创建
POST     /api/cards/generate     # AI 生成词卡
PATCH    /api/cards/[id]/progress # 更新学习进度
```

## Zustand Stores

| Store | 文件 | 职责 |
|-------|-----|------|
| `player-store` | 播放状态 | currentSong, isPlaying, currentTime, volume, playlist, repeatMode |
| `song-store` | 歌曲数据 | songs (MOCK_SONGS), getSongById |
| `card-store` | 词卡状态 | favoritedLineIds, toggleFavoriteLine |
| `app-store` | 应用状态 | isMockMode, theme |

## 关键组件

| 组件 | 路径 | 功能 |
|-----|------|------|
| `Header` | components/layout/ | 页面头部，支持 showBack/showHome 导航 |
| `AppShell` | components/layout/ | 页面布局容器，含页面切换动画 |
| `PlayerControls` | components/player/ | 播放/暂停/上下首/音量/循环模式 |
| `ProgressBar` | components/player/ | 进度条 + 时间显示 |
| `AudioProvider` | components/player/ | 音频上下文提供者 |
| `SongCard` | components/songs/ | 歌曲卡片 |
| `WordCard` | components/cards/ | 词卡展示 |
| `StudyMode` | components/cards/ | 学习模式界面（3D翻转词卡） |

## 自定义 Hooks

| Hook | 职责 |
|------|------|
| `useAudioPlayer` | HTML5 Audio 控制、进度更新、时间同步 |

## 类型定义 (types/index.ts)

```typescript
interface Song { id, title, artist, coverUrl, audioUrl?, duration, lines[], isFavorite }
interface Line { id, contentJa, contentZh, furigana?, startTime, endTime, position?, emotion? }
interface Card { id, word, reading, meaning, lineId, status: 'new'|'learning'|'mastered' }
```

## 开发命令

```bash
cd src && bun dev        # 开发服务器 http://localhost:3000
cd src && bun build      # 生产构建
cd src && bun db:push    # 推送 schema 到数据库
cd src && bun db:studio  # 打开 Drizzle Studio
```

## AI 配置

| 配置项 | 值 |
|-------|-----|
| API 地址 | `https://api.siliconflow.cn/v1/` |
| 模型 | `Qwen/Qwen3-30B-A3B` |
| 歌词翻译 | 每 8 行为一组，控制吞吐量 |

## 开发约定

- **中文沟通**: 所有注释、文档使用中文
- **Mock 模式**: 开发时使用 `data/mock/songs.ts`，API 仅在生产环境使用
- **Mock ID 格式**: Mock 歌曲使用 `song-\d+` 格式（如 song-1），真实歌曲使用 UUID
- **时间单位**: MOCK_SONGS 中 startTime/endTime 为秒，数据库中为毫秒
- **音频文件**: 测试用音频放在 `public/mock/audio/`
- **样式**: 使用 Tailwind + cn() 工具函数，组件用 shadcn/ui
- **AI 歌词翻译**: 每次处理 8 行歌词，避免 API 吞吐量限制

## 当前状态

- 播放器核心功能完成（播放/暂停/进度/切歌/循环）
- 歌词同步高亮 + 自动滚动
- 专注模式 + 普通模式
- 收藏功能（本地存储）
- 词卡学习模式（3D翻转动画）
- 页面切换过渡动画
- 全局导航支持（返回/主页按钮）
- Mock 数据: Lemon, 打上花火, 紅蓮華（均有真实音频文件）

---

## 更新日志

> 仅记录影响项目结构的重要更新，小修复不记录

| 日期 | 更新内容 | 影响范围 |
|-----|---------|---------|
| 2026-01-03 | 修复词卡翻转动画和导入歌曲跳转问题 | `StudyMode.tsx`, `songs/[id]/page.tsx` |
| 2026-01-03 | 添加页面切换动画和全局导航 | `AppShell.tsx`, `Header.tsx`, `globals.css` |
| 2026-01-03 | 精简 MOCK_SONGS，仅保留 3 首有音频的歌曲 | `data/mock/songs.ts` |
| 2026-01-03 | 优化 CLAUDE.md，添加完整项目上下文 | 文档 |
| 2026-01-03 | 修复普通模式歌词滚动、切歌导航 | `useAudioPlayer.ts`, `songs/[id]/page.tsx` |

### 更新规则

新增以下内容时必须更新此文档：
- 数据库表/字段 → 更新「数据库表结构」
- API 路由 → 更新「核心 API 路由」
- Zustand Store → 更新「Zustand Stores」
- 核心组件 → 更新「关键组件」
- 类型定义 → 更新「类型定义」
- 开发约定 → 更新「开发约定」
