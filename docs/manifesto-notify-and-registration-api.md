# マニフェスト通知API設計

## 概要

team-mirai/policyリポジトリのPR情報を受け取り、要約・保存・SNS通知を行うAPIの詳細設計書です。

## API仕様

### マニフェスト通知

**エンドポイント**: `POST /api/manifestos/notify`

**認証**: Bearer token（環境変数 `API_TOKEN`）

**リクエスト**:

```json
{
  "githubPrUrl": "https://github.com/team-mirai/policy/pull/123"
}
```

**レスポンス（成功時）**:

```json
{
  "manifestoId": "550e8400-e29b-41d4-a716-446655440000",
  "notifications": {
    "x": {
      "success": true,
      "url": "https://x.com/TeamMirai/status/1234567890"
    },
    "slack": {
      "success": true
    }
  }
}
```

**レスポンス（一部失敗時）**:

```json
{
  "manifestoId": "550e8400-e29b-41d4-a716-446655440000",
  "notifications": {
    "x": {
      "success": true,
      "url": "https://x.com/TeamMirai/status/1234567890"
    },
    "slack": {
      "success": false,
      "message": "Slack API error: channel_not_found"
    }
  }
}
```

**レスポンス（エラー時）**:

```json
{
  "error": "Failed to fetch PR information"
}
```

### マニフェスト一覧取得

**エンドポイント**: `GET /api/manifestos`

**認証**: Bearer token（環境変数 `API_TOKEN`）

**レスポンス（成功時）**:

```json
{
  "manifestos": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "環境政策の改革",
      "summary": "環境保護に関する新しい政策...",
      "content": "詳細な内容...",
      "githubPrUrl": "https://github.com/team-mirai/policy/pull/123",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## データモデル

### Manifesto

```typescript
export type ChangedFile = {
  path: string; // ファイルパス
  startLine: number; // 変更開始行
  endLine: number; // 変更終了行
};

export type Manifesto = {
  id: string; // UUID v4
  title: string; // マニフェストのタイトル
  summary: string; // 変更内容の要約 (OpenAI APIで生成)
  content: string; // 変更内容
  githubPrUrl: string; // 元のPRのURL
  createdAt: Date; // 作成日時
  changed_files: ChangedFile[]; // 変更されたファイル情報
  is_old: boolean; // 古い情報かどうか（デフォルト: false）
};
```

### NotificationHistory

```typescript
export type NotificationHistory = {
  id: string; // UUID v4
  manifestoId: string; // 関連するマニフェストID
  githubPrUrl: string; // PR URL（検索用）
  platform: string; // プラットフォーム名（"x", "slack"等）
  postUrl?: string; // 投稿URL（取得可能な場合）
  postedAt: Date; // 投稿日時
  impressions?: number; // インプレッション数（後で更新可能）
  lastUpdatedAt?: Date; // インプレッション更新日時
};
```

## バリデーションルール

- `githubPrUrl`: 必須、空文字不可、有効なGitHub PR URL

## エラーレスポンス

| ステータスコード | エラー内容           |
| ---------------- | -------------------- |
| 400              | バリデーションエラー |
| 401              | 認証エラー           |
| 500              | サーバーエラー       |

## KVストレージ設計

### キー設計

```
// マニフェストデータ
["manifestos", {manifesto_id}] -> Manifesto
["manifestos", "by-pr-url", {encoded_pr_url}] -> Manifesto

// 通知履歴
["notifications", {notification_id}] -> NotificationHistory
["notifications", "by-manifesto", {manifesto_id}, {platform}] -> NotificationHistory[]
["notifications", "by-platform", {platform}, {YYYY-MM-DD}] -> NotificationHistory[]
```

※ PR URLはキーとして使用するためにエンコード（例: `encodeURIComponent()`） ※
通知履歴は複数の検索パターンに対応（マニフェスト別、プラットフォーム別、日付別）

## 実装の流れ

### マニフェスト通知API

1. Bearer token認証
2. リクエストボディのパース
3. バリデーション
4. PR URLでKVを検索
   - 保存済みの場合: 既存データを使用
   - 未保存の場合: a. GitHub APIでPR情報を取得 b. PR差分から変更ファイル情報（changed_files）を抽出
     c. OpenAI APIで要約生成 d. 同じファイルを変更する既存マニフェストを検索し、is_old=trueに更新 e.
     新しいManifestoオブジェクトをKVに保存（is_old=false）
5. 各プラットフォームに通知
6. 通知履歴をKVに保存
7. レスポンスの返却

### 定期投稿処理

1. 全マニフェストから投稿対象を選択
2. is_old=trueのマニフェストを除外
3. 直近2件の投稿を除外
4. 残りからランダムに1件選択
5. 選択されたマニフェストを投稿

```mermaid
sequenceDiagram
    participant Client as GitHub Actions/ユーザー
    participant App as アプリケーション
    participant Auth as 認証ミドルウェア
    participant Handler as 通知ハンドラー
    participant Repo as マニフェストリポジトリ
    participant KV as Deno KV
    participant GitHub as GitHub API
    participant OpenAI as OpenAI API
    participant SNS as SNSサービス

    Client->>App: マニフェスト通知リクエスト
    App->>Auth: Bearer token検証
    Auth->>Auth: 環境変数のトークンと照合
    
    alt 認証成功
        Auth->>Handler: リクエスト処理開始
        Handler->>Handler: 入力値検証
        
        alt 検証成功
            Handler->>Repo: PR URLでマニフェスト検索
            Repo->>KV: PR URLをキーにデータ取得
            
            alt 既に保存済み
                KV-->>Repo: マニフェストデータ
                Repo-->>Handler: 既存のマニフェスト返却
            else 未保存
                KV-->>Repo: データなし
                Repo-->>Handler: null返却
                Handler->>GitHub: PR情報（タイトル・差分）取得
                GitHub-->>Handler: PR情報返却
                
                Note over Handler: PR差分から変更ファイル情報を抽出
                Handler->>Handler: changed_filesを解析
                
                Handler->>OpenAI: 差分から要約生成依頼
                OpenAI-->>Handler: 生成された要約
                
                Handler->>Repo: 同じファイルを変更する既存マニフェストを検索
                Repo->>KV: changed_filesベースで検索
                
                alt 重複するマニフェストあり
                    KV-->>Repo: 既存マニフェストリスト
                    Repo-->>Handler: 重複マニフェスト返却
                    Handler->>Repo: 既存マニフェストをis_old=trueに更新
                    Repo->>KV: 更新されたマニフェストを保存
                end
                
                Handler->>Repo: 新規マニフェスト保存（is_old=false）
                Repo->>KV: IDをキーに保存
                Repo->>KV: PR URLをキーに保存
            end
            
            Handler->>SNS: 各プラットフォームへ通知
            SNS-->>Handler: 通知結果
            Handler->>KV: 通知履歴を保存
            Handler-->>Client: 成功レスポンス（ID・通知結果）
        else 検証エラー
            Handler-->>Client: エラーレスポンス（400）
        end
    else 認証失敗
        Auth-->>Client: 認証エラー（401）
    end
```

### 定期投稿処理のシーケンス図

```mermaid
sequenceDiagram
    participant Cron as Deno Cron
    participant Service as 定期投稿サービス
    participant Repo as マニフェストリポジトリ
    participant HistoryRepo as 通知履歴リポジトリ
    participant KV as Deno KV
    participant SNS as SNSサービス

    Cron->>Service: 定期投稿実行（8:00/12:00/18:00）
    
    Service->>HistoryRepo: 全通知履歴を取得
    HistoryRepo->>KV: 履歴データ取得
    KV-->>HistoryRepo: 通知履歴リスト
    HistoryRepo-->>Service: 通知履歴返却
    
    Service->>Service: 直近2件の投稿を特定
    
    Service->>Repo: 全マニフェストを取得
    Repo->>KV: マニフェストデータ取得
    KV-->>Repo: マニフェストリスト
    Repo-->>Service: マニフェスト返却
    
    Service->>Service: 投稿対象をフィルタリング
    Note over Service: 1. is_old=trueを除外<br/>2. 直近2件を除外<br/>3. 残りをシャッフル
    
    alt 投稿可能なマニフェストあり
        Service->>Service: ランダムに1件選択
        Service->>SNS: 選択されたマニフェストを投稿
        SNS-->>Service: 投稿結果
        
        alt 投稿成功
            Service->>HistoryRepo: 通知履歴を保存
            HistoryRepo->>KV: 履歴データ保存
            Service->>Service: ログ出力（成功）
        else 投稿失敗
            Service->>Service: エラーログ出力
        end
    else 投稿可能なマニフェストなし
        Service->>Service: ログ出力（スキップ）
    end
```
