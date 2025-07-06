import { Hono } from 'hono';
import { assertEquals } from '@std/assert';

export function createTestApp(): Hono {
  const app = new Hono();
  return app;
}

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

export async function assertJsonResponse<T = unknown>(
  response: Response,
  expectedStatus: number,
  expectedBody?: T,
): Promise<T> {
  assertEquals(response.status, expectedStatus);
  assertEquals(response.headers.get('content-type'), 'application/json');

  const json: T = await response.json();

  if (expectedBody !== undefined) {
    assertEquals(json, expectedBody);
  }

  return json;
}

export async function assertTextResponse(
  response: Response,
  expectedStatus: number,
  expectedText?: string,
): Promise<string> {
  assertEquals(response.status, expectedStatus);

  const text = await response.text();

  if (expectedText !== undefined) {
    assertEquals(text, expectedText);
  }

  return text;
}
