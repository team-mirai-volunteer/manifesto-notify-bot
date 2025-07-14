# アーキテクチャ設計

## 概要

マニフェスト通知ボットは、team-mirai/policyリポジトリのマニフェスト更新を定期的にSNSに通知するシステムです。
最小限の機能から始めて、段階的に拡張していくアプローチを採用します。

## 技術スタック

- **ランタイム**: Deno 2.x
- **フレームワーク**: Hono v4
- **データベース**: Deno KV
- **デプロイ先**: Deno Deploy
- **言語**: TypeScript

## アーキテクチャ構成

### ディレクトリ構造

```
src/
├── types/          # 型定義
│   ├── api/       # APIリクエスト/レスポンス型
│   └── models/    # ドメインモデル型
├── handlers/       # HTTPハンドラー
├── repositories/   # データアクセス層
├── middleware/     # 認証などの共通処理
├── app.ts         # アプリケーション本体
└── main.ts        # エントリーポイント
```

### 各層の責務

#### 1. Types（型定義）

APIのリクエスト/レスポンスやドメインモデルの型を定義します。

- `types/models/` - ドメインモデルの型定義
- `types/api/` - APIのリクエスト/レスポンス型定義

```typescript
// 参考実装例
export type Entity = {
  id: string;
  createdAt: Date;
  updatedAt?: Date;
};

export type ApiRequest<T> = {
  data: T;
};

export type ApiResponse<T> = {
  data?: T;
  error?: string;
};
```

#### 2. Repositories（データアクセス層）

データの永続化と取得を担当します。外部ストレージ（Deno KV）とのやり取りを抽象化します。

```typescript
// 参考実装例
export type Repository<T> = {
  save(entity: T): Promise<void>;
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  delete(id: string): Promise<void>;
};

export function createRepository<T>(kv: Deno.Kv, prefix: string): Repository<T> {
  return {
    async save(entity: T & { id: string }): Promise<void> {
      await kv.set([prefix, entity.id], entity);
    },
    // ... その他のメソッド
  };
}
```

#### 3. Handlers（HTTPハンドラー）

HTTPリクエストの処理を担当します。バリデーション、データ変換、レスポンス生成を行います。

```typescript
// 参考実装例
import type { Context } from 'hono';

export type Handler = (c: Context) => Promise<Response> | Response;

export type Handlers = {
  [key: string]: Handler;
};

export function createHandlers<T>(repository: Repository<T>): Handlers {
  return {
    async create(c: Context) {
      const body = await c.req.json();
      // バリデーション、データ変換、保存処理
      return c.json({ id: 'created-id' }, 201);
    },
    async get(c: Context) {
      const id = c.req.param('id');
      const entity = await repository.findById(id);
      return entity ? c.json(entity) : c.json({ error: 'Not found' }, 404);
    },
  };
}
```

#### 4. Middleware（共通処理）

認証やロギングなど、複数のエンドポイントで使用する共通処理を実装します。

```typescript
// middleware/auth.ts
export function bearerAuth() {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.substring(7);

    // 環境変数のトークンと照合
    if (token !== Deno.env.get('API_TOKEN')) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    await next();
  };
}
```

#### 5. App（アプリケーション本体）

ルーティングとミドルウェアの設定を行います。各ハンドラーを統合します。

```typescript
// 参考実装例
import { Hono } from 'hono';
import { logger } from 'hono/logger';

export async function createApp(dependencies: AppDependencies): Promise<Hono> {
  const app = new Hono();

  // グローバルミドルウェア
  app.use('*', logger());

  // 認証が必要なルート
  app.use('/api/*', dependencies.authMiddleware);

  // ルーティング設定
  app.route('/api/resource', dependencies.resourceHandlers);

  // ヘルスチェック
  app.get('/health', (c) => c.json({ status: 'ok' }));

  return app;
}
```

## API設計原則

### RESTful API

- リソース指向のURL設計
- 適切なHTTPメソッドの使用
- ステータスコードによる状態表現

### 認証

- Bearer tokenによる認証を基本とする
- 環境変数での管理から始め、必要に応じて高度化

### エラーハンドリング

- 一貫したエラーレスポンス形式
- 適切なHTTPステータスコード
- 詳細なエラーメッセージ

## 設計方針

### 1. シンプルさを重視

- 必要最小限の構造で開始
- 複雑な抽象化は避ける
- コードの可読性を優先

### 2. テスタビリティ

- 関数型プログラミングアプローチ
- 依存性注入によるモック化
- 各層を独立してテスト可能

### 3. 段階的な拡張

- 最初は基本機能のみ実装
- 必要に応じて機能追加
- リファクタリングしやすい設計

## テスト戦略

### ユニットテスト

各層を独立してテストします。

- **Repositories**: インメモリKVを使用した統合テスト
- **Handlers**: モックリポジトリを使用したユニットテスト
- **Middleware**: リクエスト/レスポンスのモックを使用

### テストの原則

- 各層を独立してテスト可能に
- 外部依存はモック化
- テストファーストアプローチ（TDD）

## 環境設定

### 必要な環境変数

- `API_TOKEN`: Bearer認証用のトークン
- `OPENAI_API_KEY`: OpenAI APIのアクセストークン

### ローカル開発

```bash
# 環境変数を設定して起動
API_TOKEN=your-secret-token OPENAI_API_KEY=your-openai-key deno run --allow-net --allow-env --unstable-kv src/main.ts
```

ポートは8000番で固定、Deno KVはDeno Deploy環境では自動的に利用可能になります。

### テスト実行

```bash
# すべてのテストを実行
deno test --allow-env --unstable-kv

# 特定のテストを実行
deno test src/repositories/manifesto.test.ts --allow-env --unstable-kv
```

## セキュリティ考慮事項

- Bearer tokenによる認証
- 環境変数でのシークレット管理
- HTTPS通信の強制
- 入力値のバリデーション

## 参考資料

- [Hono公式ドキュメント](https://hono.dev/)
- [Deno KVドキュメント](https://docs.deno.com/kv/manual/)
