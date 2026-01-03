/**
 * 测试脚本：歌曲导入和词卡生成流程
 *
 * 运行方式: bun run test-import.ts
 */

const BASE_URL = 'http://localhost:3001';

// 测试数据 - Lemon 歌词
const LEMON_LYRICS = [
  '夢ならばどれほどよかったでしょう',
  '未だにあなたのことを夢にみる',
  '忘れたものを取りに帰るように',
  '古びた思い出の埃を払う',
];

async function main() {
  console.log('='.repeat(60));
  console.log('🎵 歌曲导入和词卡生成流程测试');
  console.log('='.repeat(60));

  // Step 1: 注册测试用户
  console.log('\n📝 Step 1: 注册测试用户...');
  const signupRes = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `test${Date.now()}@example.com`,
      password: 'test123456',
      name: '测试用户',
    }),
  });

  if (!signupRes.ok) {
    const err = await signupRes.text();
    console.log('注册失败（可能用户已存在）:', err);
  } else {
    console.log('✅ 注册成功');
  }

  // Step 2: 登录获取 session
  console.log('\n🔐 Step 2: 登录...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'test123456',
    }),
  });

  const cookies = loginRes.headers.get('set-cookie') || '';
  console.log('登录响应状态:', loginRes.status);

  // Step 3: 测试歌词解析 API（不需要登录）
  console.log('\n🔍 Step 3: 测试歌词解析 API...');
  const parseRes = await fetch(`${BASE_URL}/api/songs/parse-lyrics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lyrics: LEMON_LYRICS,
    }),
  });

  const parseData = await parseRes.json();
  console.log('解析结果:');
  console.log(JSON.stringify(parseData, null, 2));

  // Step 4: 导入歌曲（需要登录）
  console.log('\n📥 Step 4: 导入歌曲...');
  const importRes = await fetch(`${BASE_URL}/api/songs/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookies,
    },
    body: JSON.stringify({
      title: 'Lemon',
      artist: '米津玄師',
      lyrics: LEMON_LYRICS,
      options: {
        parseWithAI: true,
        generateCards: true,
        cardsPerLine: 1,
      },
    }),
  });

  const importData = await importRes.json();
  console.log('导入结果:');
  console.log(JSON.stringify(importData, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('✅ 测试完成');
  console.log('='.repeat(60));
}

main().catch(console.error);
