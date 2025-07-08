import type { Context, Next } from "hono";

/**
 * Bearer認証ミドルウェア
 * 環境変数のAPI_TOKENと照合する
 * @returns Honoミドルウェア
 */
export function bearerAuth() {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header("Authorization");
    
    // Authorizationヘッダーの確認
    if (!authHeader) {
      return c.json({ error: "Authorization header required" }, 401);
    }
    
    // Bearer形式の確認
    if (!authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Invalid authorization format" }, 401);
    }
    
    // トークンの抽出
    const token = authHeader.substring(7);
    
    // 環境変数のトークンと照合
    const expectedToken = Deno.env.get("API_TOKEN");
    if (!expectedToken) {
      console.error("API_TOKEN environment variable not set");
      return c.json({ error: "Server configuration error" }, 500);
    }
    
    if (token !== expectedToken) {
      return c.json({ error: "Invalid token" }, 401);
    }
    
    // 認証成功
    await next();
  };
}
