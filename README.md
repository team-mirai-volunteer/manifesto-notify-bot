# manifesto-notify-bot

チームみらいの[マニフェスト](https://github.com/team-mirai/policy)進化のお知らせbot

## 概要

このプロジェクトは、チームみらいのマニフェスト更新をSNSに通知するbotです。
[team-mirai/policy](https://github.com/team-mirai/policy)リポジトリのPR
URLを受け取り、自動的にマニフェストの要約を生成してX（Twitter）などのプラットフォームに投稿します。

## 技術スタック

- **ランタイム**: Deno 2.x
- **フレームワーク**: Hono v4
- **データベース**: Deno KV
- **AI**: OpenAI API（要約生成）
- **デプロイ先**: Deno Deploy
- **言語**: TypeScript

## セットアップ

### 前提条件

- Deno 2.x がインストールされていること
- OpenAI APIキーを取得していること
- X（Twitter）API認証情報を取得していること（通知機能を使用する場合）

### インストール手順

1. リポジトリをクローン

```bash
$ git clone https://github.com/team-mirai-volunteer/manifesto-notify-bot.git
$ cd manifesto-notify-bot
```

2. 環境変数の設定

`.env.example`を参考に環境変数を設定してください。

```bash
# 必須設定
export API_TOKEN=your-api-token
export OPENAI_API_KEY=your-openai-api-key

# オプション設定
export GITHUB_TOKEN=your-github-token  # 未設定の場合は公開リポジトリの読み取り専用

# X通知を有効にする場合（4つすべて必須）
export X_API_KEY=your-x-api-key
export X_API_KEY_SECRET=your-x-api-key-secret
export X_ACCESS_TOKEN=your-x-access-token
export X_ACCESS_TOKEN_SECRET=your-x-access-token-secret
```

## 開発

### 開発サーバーの起動

```bash
$ deno run dev
```

### テストの実行

```bash
# すべてのテストを実行
$ deno run test

# 特定のテストを実行
$ deno run test src/repositories/manifesto.test.ts
```

### コード品質チェック

```bash
$ deno run check
```

## プロジェクト構造

```
src/
├── types/          # 型定義
│   ├── api/       # APIリクエスト/レスポンス型
│   └── models/    # ドメインモデル型
├── handlers/       # HTTPハンドラー
├── repositories/   # データアクセス層
├── services/       # 外部サービス連携
├── middleware/     # 認証などの共通処理
├── app.ts         # アプリケーション本体
└── main.ts        # エントリーポイント
```

## ドキュメント

- [アーキテクチャ設計](./docs/architecture.md)
- [マニフェスト通知API設計](./docs/manifesto-notify-and-registration-api.md)

## ライセンス

GNU Affero General Public License v3.0

詳細は [LICENSE](./LICENSE) ファイルを参照してください。
