import { assertEquals, assertExists } from '@std/assert';
import { createManifestoRepository } from './manifesto.ts';
import type { Manifesto } from '../types/models/manifesto.ts';

// テスト用のマニフェストデータ
const TEST_MANIFESTO: Manifesto = {
  id: 'test-123',
  title: 'テストマニフェスト',
  summary: 'これはテスト用の要約です',
  content: 'これはテスト用のマニフェストの内容です',
  githubPrUrl: 'https://github.com/team-mirai/policy/pull/1',
  createdAt: new Date('2024-01-01T00:00:00Z'),
};

Deno.test('マニフェストリポジトリ', async (t) => {
  await t.step('保存と取得', async () => {
    using kv = await Deno.openKv(':memory:');
    const repo = createManifestoRepository(kv);

    // 保存
    await repo.save(TEST_MANIFESTO);

    // 取得して検証
    const found = await repo.findById(TEST_MANIFESTO.id);
    assertExists(found);
    assertEquals(found, TEST_MANIFESTO);
  });

  await t.step('存在しないIDの場合はnullを返す', async () => {
    using kv = await Deno.openKv(':memory:');
    const repo = createManifestoRepository(kv);

    const found = await repo.findById('non-existent');
    assertEquals(found, null);
  });
});
