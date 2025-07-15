import { assertEquals, assertExists } from '@std/assert';
import { createManifestoRepository } from './manifesto.ts';
import type { Manifesto } from '../types/models/manifesto.ts';

// テスト用のマニフェストデータ
const TEST_MANIFESTO: Manifesto = {
  id: 'test-123',
  title: 'テストマニフェスト',
  summary: 'これはテスト用の要約です',
  diff: 'これはテスト用のマニフェストの内容です',
  githubPrUrl: 'https://github.com/team-mirai/policy/pull/1',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  changed_files: [],
  is_old: false,
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

  await t.step('changed_filesでマニフェストを検索', async () => {
    using kv = await Deno.openKv(':memory:');
    const repo = createManifestoRepository(kv);

    // 複数のマニフェストを保存
    const manifesto1 = {
      ...TEST_MANIFESTO,
      id: 'test-1',
      changed_files: [
        { path: 'src/file1.ts', startLine: 10, endLine: 20 },
        { path: 'src/file2.ts', startLine: 5, endLine: 15 },
      ],
    };
    const manifesto2 = {
      ...TEST_MANIFESTO,
      id: 'test-2',
      githubPrUrl: 'https://github.com/team-mirai/policy/pull/2',
      changed_files: [
        { path: 'src/file1.ts', startLine: 25, endLine: 30 },
        { path: 'src/file3.ts', startLine: 1, endLine: 10 },
      ],
    };
    const manifesto3 = {
      ...TEST_MANIFESTO,
      id: 'test-3',
      githubPrUrl: 'https://github.com/team-mirai/policy/pull/3',
      changed_files: [
        { path: 'src/file4.ts', startLine: 1, endLine: 100 },
      ],
    };

    await repo.save(manifesto1);
    await repo.save(manifesto2);
    await repo.save(manifesto3);

    // file1.tsを変更するマニフェストを検索
    const found = await repo.findByChangedFiles([
      { path: 'src/file1.ts', startLine: 15, endLine: 25 },
    ]);

    assertEquals(found.length, 2);
    const foundIds = found.map((m) => m.id).sort();
    assertEquals(foundIds, ['test-1', 'test-2']);
  });

  await t.step('行範囲が重複するマニフェストを検索', async () => {
    using kv = await Deno.openKv(':memory:');
    const repo = createManifestoRepository(kv);

    const manifesto1 = {
      ...TEST_MANIFESTO,
      id: 'test-1',
      changed_files: [
        { path: 'src/config.ts', startLine: 10, endLine: 20 },
      ],
    };
    const manifesto2 = {
      ...TEST_MANIFESTO,
      id: 'test-2',
      githubPrUrl: 'https://github.com/team-mirai/policy/pull/2',
      changed_files: [
        { path: 'src/config.ts', startLine: 15, endLine: 25 },
      ],
    };
    const manifesto3 = {
      ...TEST_MANIFESTO,
      id: 'test-3',
      githubPrUrl: 'https://github.com/team-mirai/policy/pull/3',
      changed_files: [
        { path: 'src/config.ts', startLine: 30, endLine: 40 },
      ],
    };

    await repo.save(manifesto1);
    await repo.save(manifesto2);
    await repo.save(manifesto3);

    // 行範囲18-22を変更（manifesto1とmanifesto2と重複）
    const found = await repo.findByChangedFiles([
      { path: 'src/config.ts', startLine: 18, endLine: 22 },
    ]);

    assertEquals(found.length, 2);
    const foundIds = found.map((m) => m.id).sort();
    assertEquals(foundIds, ['test-1', 'test-2']);
  });

  await t.step('updateメソッドでマニフェストを更新', async () => {
    using kv = await Deno.openKv(':memory:');
    const repo = createManifestoRepository(kv);

    // 保存
    await repo.save(TEST_MANIFESTO);

    // 更新
    const updated = {
      ...TEST_MANIFESTO,
      is_old: true,
      summary: '更新された要約',
    };
    await repo.update(updated);

    // 取得して検証
    const found = await repo.findById(TEST_MANIFESTO.id);
    assertExists(found);
    assertEquals(found.is_old, true);
    assertEquals(found.summary, '更新された要約');
  });
});
