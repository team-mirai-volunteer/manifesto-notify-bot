import { createApp } from './app.ts';

const app = createApp();
const port = 8000;

console.log(`Server is running on http://localhost:${port}`);

Deno.serve({ port }, app.fetch);
