import { createApp } from './app.ts';

/**
 * アプリケーションのエントリーポイント
 */
if (import.meta.main) {
  try {
    // アプリケーションの作成
    const app = await createApp();

    // ポート番号は固定
    const port = 8000;

    console.log(`🚀 Server is running on http://localhost:${port}`);
    console.log(`📝 Manifesto API endpoint: POST http://localhost:${port}/api/manifestos`);
    console.log(`🔒 Authentication required with Bearer token (API_TOKEN env var)`);
    console.log(`🤖 OpenAI integration enabled (OPENAI_API_KEY env var)`);

    // サーバーの起動
    Deno.serve({ port }, app.fetch);
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}
