import { Hono } from 'hono';

/**
 * テスト用のアプリケーションインスタンスを作成するヘルパー
 */
export function createTestApp(): Hono {
  const app = new Hono();
  return app;
}

/**
 * APIレスポンスのテストヘルパー
 */
export async function testApiResponse(
  app: Hono,
  method: string,
  path: string,
  options?: {
    body?: unknown;
    headers?: Record<string, string>;
  },
): Promise<Response> {
  const url = `http://localhost${path}`;
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  };

  if (options?.body) {
    init.body = JSON.stringify(options.body);
  }

  return await app.request(url, init);
}

/**
 * JSONレスポンスの検証ヘルパー
 */
export async function assertJsonResponse<T = unknown>(
  response: Response,
  expectedStatus: number,
  expectedBody?: T,
): Promise<T> {
  const { assertEquals } = await import('@std/assert');

  assertEquals(response.status, expectedStatus);
  assertEquals(response.headers.get('content-type'), 'application/json');

  const json: T = await response.json();

  if (expectedBody !== undefined) {
    assertEquals(json, expectedBody);
  }

  return json;
}

/**
 * テキストレスポンスの検証ヘルパー
 */
export async function assertTextResponse(
  response: Response,
  expectedStatus: number,
  expectedText?: string,
): Promise<string> {
  const { assertEquals } = await import('@std/assert');

  assertEquals(response.status, expectedStatus);

  const text = await response.text();

  if (expectedText !== undefined) {
    assertEquals(text, expectedText);
  }

  return text;
}
