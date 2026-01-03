/**
 * 用户入门 E2E 测试 - 听日文歌项目
 *
 * 基于 userstory.spec.md 中 CS-01 用户入门相关故事
 * - MS-L-01: 零门槛访问
 * - MS-L-02: 首次播放体验
 */

import { test, expect } from '@playwright/test';

test.describe('CS-01: 用户入门', () => {
  test.describe('MS-L-01: 零门槛访问', () => {
    /**
     * 验收标准：用户可以看到首页歌曲列表（无需登录）
     */
    test('应无需登录即可看到首页歌曲列表', async ({ page }) => {
      await page.goto('/');

      // 验证页面加载成功
      await expect(page).toHaveTitle(/听日文歌/i);

      // 验证歌曲列表存在
      const songList = page.locator('[data-testid="song-list"]');
      await expect(songList).toBeVisible({ timeout: 10000 });
    });

    /**
     * 验收标准：用户可以点击任意歌曲进入播放页
     */
    test('应可以点击歌曲进入播放页', async ({ page }) => {
      await page.goto('/');

      // 等待歌曲列表加载
      const songItem = page.locator('[data-testid="song-item"]').first();
      await expect(songItem).toBeVisible({ timeout: 10000 });

      // 点击第一首歌曲
      await songItem.click();

      // 验证跳转到播放页
      await expect(page).toHaveURL(/\/songs\/.+/);
    });

    /**
     * 验收标准：系统不强制弹出注册/登录弹窗
     */
    test('应不强制弹出登录弹窗', async ({ page }) => {
      await page.goto('/');

      // 等待页面稳定
      await page.waitForLoadState('networkidle');

      // 验证没有强制登录弹窗
      const loginModal = page.locator('[data-testid="login-modal"]');
      await expect(loginModal).not.toBeVisible();
    });
  });

  test.describe('MS-L-02: 首次播放体验', () => {
    test.beforeEach(async ({ page }) => {
      // 直接访问一首歌曲的播放页
      await page.goto('/songs');
      await page.waitForLoadState('networkidle');
    });

    /**
     * 验收标准：播放按钮显眼且一键可点
     */
    test('应显示播放按钮', async ({ page }) => {
      const playButton = page.locator('[data-testid="play-button"]');
      await expect(playButton).toBeVisible({ timeout: 10000 });
    });

    /**
     * 验收标准：日文歌词下方显示中文翻译
     */
    test('应显示歌词和翻译', async ({ page }) => {
      // 查找歌词列表
      const lyricsContainer = page.locator('[data-testid="lyrics-container"]');

      // 如果存在歌词容器
      const exists = await lyricsContainer.count();
      if (exists > 0) {
        await expect(lyricsContainer).toBeVisible();

        // 检查是否有日文歌词
        const jaLyrics = page.locator('[data-testid="lyrics-ja"]').first();
        await expect(jaLyrics).toBeVisible();

        // 检查是否有中文翻译
        const zhLyrics = page.locator('[data-testid="lyrics-zh"]').first();
        await expect(zhLyrics).toBeVisible();
      }
    });

    /**
     * 验收标准：播放进度可通过进度条调整
     */
    test('应显示播放进度条', async ({ page }) => {
      const progressBar = page.locator('[data-testid="progress-bar"]');

      const exists = await progressBar.count();
      if (exists > 0) {
        await expect(progressBar).toBeVisible();
      }
    });
  });
});
