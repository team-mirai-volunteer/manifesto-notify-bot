# TODO: マニフェスト通知API実装

## 1. データ層の拡張

### ManifestoRepositoryの拡張

- [x] `findByPrUrl`メソッドを追加するテストを作成（RED）
- [x] `findByPrUrl`メソッドを実装（GREEN）
- [x] `save`メソッドがPR URLでも保存するテストを作成（RED）
- [x] `save`メソッドを修正してIDとPR URLの両方で保存（GREEN）
- [x] リファクタリング（REFACTOR）

### NotificationHistoryRepositoryの作成

- [x] `NotificationHistory`型を定義
- [x] `NotificationHistoryRepository`インターフェースを定義
- [x] `save`メソッドのテストを作成（RED）
- [x] `save`メソッドを実装（GREEN）
- [x] `findByManifesto`メソッドのテストを作成（RED）
- [x] `findByManifesto`メソッドを実装（GREEN）
- [x] リファクタリング（REFACTOR）

## 2. 外部サービス連携

### GitHub APIサービス

- [ ] `GitHubService`インターフェースを定義
- [ ] `getPullRequest`メソッドのテストを作成（RED）
- [ ] `getPullRequest`メソッドを実装（タイトル・差分を一度に取得）（GREEN）
- [ ] エラーハンドリングのテストを追加
- [ ] リファクタリング（REFACTOR）

### 通知サービス

- [ ] `NotificationService`インターフェースを定義
- [ ] `NotificationResult`型を定義
- [ ] Strategy Patternでプラットフォーム別実装を管理する設計

### X（Twitter）通知サービス

- [ ] `XNotificationService`のテストを作成（RED）
- [ ] `XNotificationService`を実装（GREEN）
- [ ] X API v2の認証設定
- [ ] 投稿文字数制限（280文字）の考慮
- [ ] エラーハンドリング
- [ ] リファクタリング（REFACTOR）

### Slack通知サービス

- [ ] `SlackNotificationService`のモックテストを作成（RED）
- [ ] `SlackNotificationService`のモック実装（GREEN）
- [ ] 実装は後回し（将来の拡張用）

## 3. APIエンドポイントの変更

### ハンドラーの修正

- [ ] 既存の`createHandler`を`notifyHandler`に変更するテストを作成（RED）
- [ ] エンドポイントを`/api/manifestos/notify`に変更
- [ ] リクエストボディを`{ githubPrUrl, platforms? }`に変更
- [ ] PR URLでマニフェストを検索する処理を追加
- [ ] 未保存の場合はGitHub API → OpenAI → 保存の処理を実装
- [ ] 各プラットフォームへの通知処理を追加
- [ ] 通知履歴の保存処理を追加
- [ ] レスポンス形式を新仕様に合わせる
- [ ] エラーハンドリングの強化
- [ ] リファクタリング（REFACTOR）

### ルーティングの更新

- [ ] `app.ts`でルーティングを`/api/manifestos/notify`に変更
- [ ] 既存の`/api/manifestos` POSTを削除
- [ ] `GET /api/manifestos`は維持

## 4. 設定・ドキュメント

### 環境変数

- [ ] `.env.example`に新しい環境変数を追加
  - [ ] `X_API_KEY`（X API用）
  - [ ] `X_API_SECRET`
  - [ ] `X_ACCESS_TOKEN`
  - [ ] `X_ACCESS_TOKEN_SECRET`

### テスト

- [ ] 統合テストの作成
- [ ] モックサーバーの設定

### ドキュメント

- [ ] README.mdのAPI仕様リンクを`docs/manifesto-registration-api.md`に更新
- [ ] 環境変数の設定方法を追記

## 5. 追加考慮事項

### エラーハンドリング

- [ ] GitHub APIのレート制限対策
- [ ] 各プラットフォームのAPI制限対策
- [ ] リトライ機構の実装
- [ ] タイムアウト設定

### セキュリティ

- [ ] APIキーの安全な管理
- [ ] 入力値のサニタイゼーション
- [ ] CORS設定の確認

### パフォーマンス

- [ ] 非同期処理の最適化
- [ ] KVアクセスの効率化
- [ ] キャッシュ戦略

## 実装順序（推奨）

1. ManifestoRepositoryの拡張（基盤となるため最優先）
2. GitHub APIサービス（データ取得に必要）
3. notifyHandlerの基本実装
4. 通知サービスインターフェースとX実装
5. NotificationHistoryRepository
6. 統合テスト
7. ドキュメント更新

## 完了条件

- [ ] 全てのテストが通る
- [ ] `deno task check`が通る
- [ ] ドキュメントが最新
- [ ] PRレビューの承認
