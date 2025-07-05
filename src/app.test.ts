import { assertEquals } from '@std/assert';
import { createApp } from './app.ts';
import { assertJsonResponse, assertTextResponse, testApiResponse } from './test/helpers.ts';

Deno.test('GET / returns hello message', async () => {
  // Arrange
  const app = createApp();

  // Act
  const res = await testApiResponse(app, 'GET', '/');

  // Assert
  await assertTextResponse(res, 200, 'Hello, Manifesto Notify Bot!');
});

Deno.test('GET /health returns health status', async () => {
  // Arrange
  const app = createApp();

  // Act
  const res = await testApiResponse(app, 'GET', '/health');

  // Assert
  const json = await assertJsonResponse<{ status: string; timestamp: string }>(res, 200);
  assertEquals(json.status, 'ok');
  assertEquals(typeof json.timestamp, 'string');
  // タイムスタンプが有効なISO 8601形式であることを確認
  assertEquals(new Date(json.timestamp).toISOString(), json.timestamp);
});

Deno.test('GET /notfound returns 404', async () => {
  // Arrange
  const app = createApp();

  // Act
  const res = await testApiResponse(app, 'GET', '/notfound');

  // Assert
  await assertTextResponse(res, 404, '404 Not Found');
});
