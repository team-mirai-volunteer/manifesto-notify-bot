# プロジェクト基盤構築 TODO リスト

## 作業フロー

- １つずつ作業していく方針とする
- 作業がおわったら必ず test, lint, fmt を実行して問題ないことを確認する
- 次の作業にいくまえに作業内容をチェックするので、終わったら知らせる

## 1. プロジェクト設定ファイルの作成

- [x] `deno.json` の作成
  - imports設定（hono, @std/assert）
  - tasks設定（dev, test, lint, fmt, check）
  - ~~compilerOptions設定（JSX対応）~~ （必要時に追加）
  - lint/fmt設定

## 2. ディレクトリ構造の作成

- [x] `src/` - メインソースコードディレクトリ
- [x] `src/domain/manifesto/` - マニフェスト集約
- [x] `src/domain/notification/` - 通知値オブジェクト
- [x] `src/application/manifesto/` - マニフェストユースケース
- [x] `src/application/notification/` - 通知ユースケース
- [x] `src/infrastructure/repository/` - リポジトリ実装
- [x] `src/infrastructure/service/` - 外部サービス連携
- [x] `src/presentation/handler/` - HTTPハンドラー
- [x] `src/presentation/middleware/` - 共通処理
- [x] `src/shared/config/` - 設定ファイル

## 3. 基本ファイルの作成

- [x] `src/main.ts` - エントリーポイント（Honoアプリケーション起動）
- [x] `src/app.ts` - Honoアプリケーションの設定
- [x] `.gitignore` - Git除外設定
- [x] `.env.example` - 環境変数テンプレート

## 4. 開発環境の動作確認

- [x] Hello Worldエンドポイントの実装（`GET /`）
- [x] 開発サーバーの起動確認（`deno task dev`）
- [x] ヘルスチェックエンドポイント（`GET /health`）

## 5. テスト環境の構築

- [x] サンプルテストファイルの作成（`src/app.test.ts`）
- [x] テスト実行の確認（`deno task test`）
- [x] テストヘルパー関数の作成

## 6. ドキュメントの更新

- [x] README.md の更新（セットアップ手順、開発フロー）
- [x] CONTRIBUTING.md の作成（コントリビューション方法）
