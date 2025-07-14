import { createApp } from './app.ts';
import { registerCronJobs } from './cron.ts';

try {
  const app = await createApp();

  const port = 8000;

  console.log(`🚀 Server is running on http://localhost:${port}`);

  registerCronJobs();

  // サーバーの起動
  Deno.serve({ port }, app.fetch);
} catch (error) {
  console.error('Failed to start server:', error);
}
