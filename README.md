# manifesto-notify-bot

チームみらいの[マニフェスト](https://github.com/team-mirai/policy)進化のお知らせbot

## 概要

このプロジェクトは、チームみらいのマニフェスト更新を定期的にSNSに通知するbotです。
過去のマニフェストをデータベースに保存し、スケジューラーを使って定期的に投稿します。

## 技術スタック

- **ランタイム**: Deno 2.x
- **フレームワーク**: Hono v4
- **言語**: TypeScript
- **アーキテクチャ**: Evans DDD (ミニマル構成)
- **デプロイ**: Google Cloud Platform
  - Cloud Run (API)
  - Firestore または Cloud SQL (データベース)
  - Cloud Scheduler (定期実行)

## セットアップ

### 前提条件

- Deno 2.x がインストールされていること
- Git がインストールされていること

### インストール手順

1. リポジトリをクローン

```bash
git clone https://github.com/team-mirai-volunteer/manifesto-notify-bot.git
cd manifesto-notify-bot
```

2. 環境変数の設定

```bash
cp .env.example .env
# .envファイルを編集して必要な環境変数を設定
```

3. 依存関係の確認

```bash
deno task check
```

## 開発フロー

### 開発サーバーの起動

```bash
deno task dev
```

### テストの実行

```bash
deno task test
```

### コード品質チェック

```bash
# 個別実行
deno task lint  # Lintチェック
deno task fmt   # フォーマットチェック

# まとめて実行
deno task check # lint + fmt + test
```

## プロジェクト構造

```
src/
├── domain/           # ドメイン層
│   ├── manifesto/   # マニフェスト集約
│   └── notification/ # 通知値オブジェクト
├── application/      # アプリケーション層
│   ├── manifesto/   # マニフェストユースケース
│   └── notification/ # 通知ユースケース
├── infrastructure/   # インフラストラクチャ層
│   ├── repository/  # リポジトリ実装
│   └── service/     # 外部サービス連携
├── presentation/     # プレゼンテーション層
│   ├── handler/     # HTTPハンドラー
│   └── middleware/  # ミドルウェア
├── shared/          # 共通コンポーネント
│   └── config/      # 設定
├── test/            # テストヘルパー
├── app.ts           # Honoアプリケーション設定
├── app.test.ts      # アプリケーションテスト
└── main.ts          # エントリーポイント
```

## API エンドポイント

- `GET /` - ウェルカムメッセージ
- `GET /health` - ヘルスチェック

## ライセンス

GNU Affero General Public License v3.0

詳細は [LICENSE](./LICENSE) ファイルを参照してください。
