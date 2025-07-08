import { assertEquals, assertExists } from '@std/assert';
import { createManifestoRepository } from './manifesto.ts';
import type { Manifesto } from '../types/models/manifesto.ts';

Deno.test('ManifestoRepository - save and findById', async () => {
  using kv = await Deno.openKv(':memory:');
  const repo = createManifestoRepository(kv);

  const manifesto: Manifesto = {
    id: 'test-123',
    title: 'テストマニフェスト',
    summary: 'これはテスト用の要約です',
    content: 'これはテスト用のマニフェストの内容です',
    githubPrUrl: 'https://github.com/team-mirai/policy/pull/1',
    createdAt: new Date('2024-01-01T00:00:00Z'),
  };

  // 保存
  await repo.save(manifesto);

  // 取得して検証
  const found = await repo.findById('test-123');
  assertExists(found);
  assertEquals(found.id, manifesto.id);
  assertEquals(found.title, manifesto.title);
  assertEquals(found.summary, manifesto.summary);
  assertEquals(found.content, manifesto.content);
  assertEquals(found.githubPrUrl, manifesto.githubPrUrl);
  assertEquals(found.createdAt, manifesto.createdAt);
});

Deno.test('ManifestoRepository - findById returns null for non-existent ID', async () => {
  using kv = await Deno.openKv(':memory:');
  const repo = createManifestoRepository(kv);

  const found = await repo.findById('non-existent');
  assertEquals(found, null);
});
