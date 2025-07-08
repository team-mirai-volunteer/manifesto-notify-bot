import type { Context, Next } from 'hono';

export function bearerAuth(
  expectedToken: string,
): (c: Context, next: Next) => Promise<void | Response> {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    // Authorizationヘッダーの確認
    if (!authHeader) {
      return c.json({ error: 'Authorization header required' }, 401);
    }

    // Bearer形式の確認
    if (!authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Invalid authorization format' }, 401);
    }

    // トークンの抽出
    const token = authHeader.substring(7);

    if (token !== expectedToken) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    // 認証成功
    await next();
  };
}
