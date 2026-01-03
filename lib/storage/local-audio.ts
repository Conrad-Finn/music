'use client'

/**
 * 本地音频存储服务
 * 使用 IndexedDB 存储音频文件，实现离线播放
 */

const DB_NAME = 'listening-jp-songs'
const DB_VERSION = 1
const AUDIO_STORE = 'audio-files'
const METADATA_STORE = 'audio-metadata'

export interface AudioMetadata {
  id: string
  songId: string
  fileName: string
  mimeType: string
  size: number
  duration?: number
  createdAt: string
}

class LocalAudioStorage {
  private db: IDBDatabase | null = null
  private dbPromise: Promise<IDBDatabase> | null = null

  /**
   * 初始化数据库连接
   */
  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db

    if (this.dbPromise) return this.dbPromise

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // 创建音频文件存储
        if (!db.objectStoreNames.contains(AUDIO_STORE)) {
          db.createObjectStore(AUDIO_STORE, { keyPath: 'id' })
        }

        // 创建元数据存储
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          const metadataStore = db.createObjectStore(METADATA_STORE, { keyPath: 'id' })
          metadataStore.createIndex('songId', 'songId', { unique: true })
        }
      }
    })

    return this.dbPromise
  }

  /**
   * 保存音频文件
   */
  async saveAudio(songId: string, file: File): Promise<AudioMetadata> {
    const db = await this.getDB()
    const id = `audio_${songId}`

    // 读取文件为 ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()

    // 获取音频时长
    const duration = await this.getAudioDuration(file)

    const metadata: AudioMetadata = {
      id,
      songId,
      fileName: file.name,
      mimeType: file.type || 'audio/mpeg',
      size: file.size,
      duration,
      createdAt: new Date().toISOString(),
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([AUDIO_STORE, METADATA_STORE], 'readwrite')

      transaction.onerror = () => reject(transaction.error)

      // 保存音频数据
      const audioStore = transaction.objectStore(AUDIO_STORE)
      audioStore.put({ id, data: arrayBuffer })

      // 保存元数据
      const metadataStore = transaction.objectStore(METADATA_STORE)
      metadataStore.put(metadata)

      transaction.oncomplete = () => resolve(metadata)
    })
  }

  /**
   * 获取音频文件的 Blob URL
   */
  async getAudioUrl(songId: string): Promise<string | null> {
    const db = await this.getDB()
    const id = `audio_${songId}`

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([AUDIO_STORE, METADATA_STORE], 'readonly')

      // 获取元数据
      const metadataStore = transaction.objectStore(METADATA_STORE)
      const metadataRequest = metadataStore.get(id)

      metadataRequest.onsuccess = () => {
        const metadata = metadataRequest.result as AudioMetadata | undefined

        if (!metadata) {
          resolve(null)
          return
        }

        // 获取音频数据
        const audioStore = transaction.objectStore(AUDIO_STORE)
        const audioRequest = audioStore.get(id)

        audioRequest.onsuccess = () => {
          const audioData = audioRequest.result
          if (!audioData?.data) {
            resolve(null)
            return
          }

          // 创建 Blob URL
          const blob = new Blob([audioData.data], { type: metadata.mimeType })
          const url = URL.createObjectURL(blob)
          resolve(url)
        }

        audioRequest.onerror = () => reject(audioRequest.error)
      }

      metadataRequest.onerror = () => reject(metadataRequest.error)
    })
  }

  /**
   * 获取音频元数据
   */
  async getMetadata(songId: string): Promise<AudioMetadata | null> {
    const db = await this.getDB()
    const id = `audio_${songId}`

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(METADATA_STORE, 'readonly')
      const store = transaction.objectStore(METADATA_STORE)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 检查歌曲是否有本地音频
   */
  async hasLocalAudio(songId: string): Promise<boolean> {
    const metadata = await this.getMetadata(songId)
    return metadata !== null
  }

  /**
   * 删除音频文件
   */
  async deleteAudio(songId: string): Promise<void> {
    const db = await this.getDB()
    const id = `audio_${songId}`

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([AUDIO_STORE, METADATA_STORE], 'readwrite')

      transaction.onerror = () => reject(transaction.error)

      const audioStore = transaction.objectStore(AUDIO_STORE)
      audioStore.delete(id)

      const metadataStore = transaction.objectStore(METADATA_STORE)
      metadataStore.delete(id)

      transaction.oncomplete = () => resolve()
    })
  }

  /**
   * 获取所有本地音频的元数据
   */
  async getAllMetadata(): Promise<AudioMetadata[]> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(METADATA_STORE, 'readonly')
      const store = transaction.objectStore(METADATA_STORE)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 获取存储使用情况
   */
  async getStorageUsage(): Promise<{ used: number; count: number }> {
    const allMetadata = await this.getAllMetadata()
    const used = allMetadata.reduce((sum, m) => sum + m.size, 0)
    return { used, count: allMetadata.length }
  }

  /**
   * 清空所有本地音频
   */
  async clearAll(): Promise<void> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([AUDIO_STORE, METADATA_STORE], 'readwrite')

      transaction.onerror = () => reject(transaction.error)

      const audioStore = transaction.objectStore(AUDIO_STORE)
      audioStore.clear()

      const metadataStore = transaction.objectStore(METADATA_STORE)
      metadataStore.clear()

      transaction.oncomplete = () => resolve()
    })
  }

  /**
   * 获取音频时长
   */
  private getAudioDuration(file: File): Promise<number | undefined> {
    return new Promise((resolve) => {
      const audio = new Audio()
      const url = URL.createObjectURL(file)

      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url)
        resolve(audio.duration)
      })

      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url)
        resolve(undefined)
      })

      audio.src = url
    })
  }

  /**
   * 释放 Blob URL
   */
  revokeUrl(url: string): void {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
  }
}

// 单例导出
export const localAudioStorage = new LocalAudioStorage()

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
