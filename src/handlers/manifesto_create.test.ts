import { assertEquals } from '@std/assert';
import { Hono } from 'hono';
import { createManifestoHandlers } from './manifesto_create.ts';
import type { ManifestoRepository } from '../repositories/manifesto.ts';
import type { LLMService } from '../services/llm.ts';
import type { Manifesto } from '../types/models/manifesto.ts';

// モックリポジトリ
function createMockRepository(): ManifestoRepository {
  const saved: Manifesto[] = [];
  return {
    // deno-lint-ignore require-await
    async save(manifesto: Manifesto): Promise<void> {
      saved.push(manifesto);
    },
    // deno-lint-ignore require-await
    async findById(id: string): Promise<Manifesto | null> {
      return saved.find((m) => m.id === id) || null;
    },
  };
}

// モックLLMサービス
function createMockLLMService(summary: string): LLMService {
  return {
    // deno-lint-ignore require-await
    async generateSummary(_content: string): Promise<string> {
      return summary;
    },
  };
}

Deno.test('createManifestoHandlers - successful creation', async () => {
  const mockRepo = createMockRepository();
  const mockLLM = createMockLLMService('要約されたテキスト');
  const handlers = createManifestoHandlers(mockRepo, mockLLM);

  const app = new Hono();
  app.post('/test', ...handlers.create);

  const body = {
    title: '環境政策の改革',
    content: '詳細な内容...',
    githubPrUrl: 'https://github.com/team-mirai/policy/pull/123',
  };

  const res = await app.request('/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  assertEquals(res.status, 201);
  const json = await res.json();
  assertEquals(typeof json.id, 'string');
  assertEquals(json.id.length, 36); // UUID v4の長さ
});

Deno.test('createManifestoHandlers - missing title', async () => {
  const mockRepo = createMockRepository();
  const mockLLM = createMockLLMService('要約');
  const handlers = createManifestoHandlers(mockRepo, mockLLM);

  const app = new Hono();
  app.post('/test', ...handlers.create);

  const body = {
    title: '',
    content: '内容',
    githubPrUrl: 'https://github.com/team-mirai/policy/pull/123',
  };

  const res = await app.request('/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  assertEquals(res.status, 400);
  const json = await res.json();
  assertEquals(json.success, false);
  assertEquals(json.error.name, 'ZodError');
  assertEquals(json.error.issues[0].message, 'Title is required');
});

Deno.test('createManifestoHandlers - missing content', async () => {
  const mockRepo = createMockRepository();
  const mockLLM = createMockLLMService('要約');
  const handlers = createManifestoHandlers(mockRepo, mockLLM);

  const app = new Hono();
  app.post('/test', ...handlers.create);

  const body = {
    title: 'タイトル',
    content: '',
    githubPrUrl: 'https://github.com/team-mirai/policy/pull/123',
  };

  const res = await app.request('/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  assertEquals(res.status, 400);
  const json = await res.json();
  assertEquals(json.success, false);
  assertEquals(json.error.name, 'ZodError');
  assertEquals(json.error.issues[0].message, 'Content is required');
});

Deno.test('createManifestoHandlers - invalid GitHub PR URL', async () => {
  const mockRepo = createMockRepository();
  const mockLLM = createMockLLMService('要約');
  const handlers = createManifestoHandlers(mockRepo, mockLLM);

  const app = new Hono();
  app.post('/test', ...handlers.create);

  const body = {
    title: 'タイトル',
    content: '内容',
    githubPrUrl: 'not-a-url',
  };

  const res = await app.request('/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  assertEquals(res.status, 400);
  const json = await res.json();
  assertEquals(json.success, false);
  assertEquals(json.error.name, 'ZodError');
  assertEquals(json.error.issues[0].message, 'GitHub PR URL must be a valid URL');
});

Deno.test('createManifestoHandlers - OpenAI service error', async () => {
  const mockRepo = createMockRepository();
  const mockLLM: LLMService = {
    // deno-lint-ignore require-await
    async generateSummary(_content: string): Promise<string> {
      throw new Error('LLM API error');
    },
  };
  const handlers = createManifestoHandlers(mockRepo, mockLLM);

  const app = new Hono();
  app.post('/test', ...handlers.create);

  const body = {
    title: 'タイトル',
    content: '内容',
    githubPrUrl: 'https://github.com/team-mirai/policy/pull/123',
  };

  const res = await app.request('/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  assertEquals(res.status, 500);
  const json = await res.json();
  assertEquals(json.error, 'Internal server error');
});
