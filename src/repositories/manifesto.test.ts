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

  await t.step('PR URLで検索できる', async () => {
    using kv = await Deno.openKv(':memory:');
    const repo = createManifestoRepository(kv);

    // まず保存
    await repo.save(TEST_MANIFESTO);

    // PR URLで検索
    const found = await repo.findByPrUrl(TEST_MANIFESTO.githubPrUrl);
    assertExists(found);
    assertEquals(found, TEST_MANIFESTO);
  });

  await t.step('存在しないPR URLの場合はnullを返す', async () => {
    using kv = await Deno.openKv(':memory:');
    const repo = createManifestoRepository(kv);

    const found = await repo.findByPrUrl('https://github.com/team-mirai/policy/pull/999');
    assertEquals(found, null);
  });

  await t.step('全てのマニフェストを取得', async () => {
    using kv = await Deno.openKv(':memory:');
    const repo = createManifestoRepository(kv);

    // 複数のマニフェストを保存
    const manifesto1 = { ...TEST_MANIFESTO, id: 'test-1' };
    const manifesto2 = {
      ...TEST_MANIFESTO,
      id: 'test-2',
      githubPrUrl: 'https://github.com/team-mirai/policy/pull/2',
    };
    const manifesto3 = {
      ...TEST_MANIFESTO,
      id: 'test-3',
      githubPrUrl: 'https://github.com/team-mirai/policy/pull/3',
    };

    await repo.save(manifesto1);
    await repo.save(manifesto2);
    await repo.save(manifesto3);

    // 全て取得
    const all = await repo.findAll();
    assertEquals(all.length, 3);

    // IDでソートして確認
    all.sort((a, b) => a.id.localeCompare(b.id));
    assertEquals(all[0].id, 'test-1');
    assertEquals(all[1].id, 'test-2');
    assertEquals(all[2].id, 'test-3');
  });

  await t.step('マニフェストがない場合は空配列を返す', async () => {
    using kv = await Deno.openKv(':memory:');
    const repo = createManifestoRepository(kv);

    const all = await repo.findAll();
    assertEquals(all, []);
  });
});
