import { assertEquals } from "@std/assert";
import { Hono } from "hono";
import { bearerAuth } from "./auth.ts";

// テスト用のモックアプリケーションを作成
function createTestApp() {
  const app = new Hono();
  app.use("/protected/*", bearerAuth());
  app.get("/protected/test", (c) => c.json({ message: "success" }));
  return app;
}

Deno.test("bearerAuth - allows valid token", async () => {
  // 環境変数を設定
  const originalToken = Deno.env.get("API_TOKEN");
  Deno.env.set("API_TOKEN", "test-token-123");
  
  try {
    const app = createTestApp();
    const res = await app.request("/protected/test", {
      headers: {
        "Authorization": "Bearer test-token-123",
      },
    });
    
    assertEquals(res.status, 200);
    const json = await res.json();
    assertEquals(json.message, "success");
  } finally {
    // 環境変数を元に戻す
    if (originalToken) {
      Deno.env.set("API_TOKEN", originalToken);
    } else {
      Deno.env.delete("API_TOKEN");
    }
  }
});

Deno.test("bearerAuth - rejects missing header", async () => {
  const app = createTestApp();
  const res = await app.request("/protected/test");
  
  assertEquals(res.status, 401);
  const json = await res.json();
  assertEquals(json.error, "Authorization header required");
});

Deno.test("bearerAuth - rejects invalid format", async () => {
  const app = createTestApp();
  const res = await app.request("/protected/test", {
    headers: {
      "Authorization": "Basic dGVzdDp0ZXN0",
    },
  });
  
  assertEquals(res.status, 401);
  const json = await res.json();
  assertEquals(json.error, "Invalid authorization format");
});

Deno.test("bearerAuth - rejects invalid token", async () => {
  const originalToken = Deno.env.get("API_TOKEN");
  Deno.env.set("API_TOKEN", "correct-token");
  
  try {
    const app = createTestApp();
    const res = await app.request("/protected/test", {
      headers: {
        "Authorization": "Bearer wrong-token",
      },
    });
    
    assertEquals(res.status, 401);
    const json = await res.json();
    assertEquals(json.error, "Invalid token");
  } finally {
    if (originalToken) {
      Deno.env.set("API_TOKEN", originalToken);
    } else {
      Deno.env.delete("API_TOKEN");
    }
  }
});
