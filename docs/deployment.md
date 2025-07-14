# デプロイガイド

このガイドでは、manifesto-notify-botをDeno Deployにデプロイする方法を説明します。

## 自動デプロイ

プロジェクトは`main`ブランチへのプッシュ時に自動的にDeno
Deployへデプロイされるように設定されています。

### 前提条件

1. **Deno Deployプロジェクト**: プロジェクトIDは`deno.json`に設定済みです：
   ```json
   {
     "deploy": {
       "project": "dad5dffa-ef78-4880-96c5-d7724fd55685",
       "exclude": ["**/node_modules"],
       "include": [],
       "entrypoint": "src/main.ts"
     }
   }
   ```

2. **GitHubシークレット**: GitHubリポジトリに以下のシークレットを設定する必要があります：
   - `DENO_DEPLOY_TOKEN`: Deno Deployのアクセストークン

### GitHubシークレットの設定

1. https://dash.deno.com でDeno Deployダッシュボードにアクセス
2. アカウント設定に移動
3. 新しいアクセストークンを生成
4. GitHubリポジトリで、Settings → Secrets and variables → Actions に移動
5. 「New repository secret」をクリック
6. Name: `DENO_DEPLOY_TOKEN`
7. Value: Deno Deployのアクセストークンを貼り付け
8. 「Add secret」をクリック

### デプロイワークフロー

デプロイワークフロー（`.github/workflows/deploy.yml`）は以下の動作をします：

1. `main`ブランチへのプッシュごとにトリガー
2. Denoとdeployctlをインストール
3. `deno task deploy`を実行してDeno Deployへデプロイ

## 手動デプロイ

ローカルマシンから手動でデプロイする場合：

```bash
# deployctlをインストール（未インストールの場合）
deno install -A jsr:@deno/deployctl

# 設定済みのタスクを使用してデプロイ
deno task deploy
```

Deno Deployへの認証が必要です。未ログインの場合は`deployctl login`を実行してください。

## 環境変数

Deno Deployで以下の環境変数を設定する必要があります：

### 必須変数

- `ENV`: 本番環境では`prod`に設定
- `API_TOKEN`: API アクセス用のBearer認証トークン
- `OPENAI_API_KEY`: OpenAI APIキー

### オプション変数

- `GITHUB_TOKEN`: プライベートリポジトリへのアクセス用（必要な場合）
- `X_API_KEY`: Twitter/X API認証情報（X通知を有効にするには4つすべて必要）
- `X_API_KEY_SECRET`
- `X_ACCESS_TOKEN`
- `X_ACCESS_TOKEN_SECRET`

### Deno Deployでの環境変数設定

1. Deno Deployのプロジェクトダッシュボードに移動
2. 「Settings」タブに移動
3. 「Environment Variables」まで下スクロール
4. 各変数と値を追加
5. 「Save」をクリック

## デプロイの監視

デプロイは以下の方法で監視できます：

1. **GitHub Actions**: リポジトリのActionsタブを確認
2. **Deno Deployダッシュボード**: https://dash.deno.com でデプロイログを表示
3. **ヘルスチェック**: `https://your-project.deno.dev/health` にアクセスしてデプロイを確認

## ロールバック

以前のバージョンにロールバックする必要がある場合：

1. Deno Deployプロジェクトダッシュボードに移動
2. 「Deployments」タブに移動
3. 以前の安定したデプロイメントを見つける
4. 「Promote to Production」をクリック
