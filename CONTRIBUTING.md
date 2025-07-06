# コントリビューションガイド

manifesto-notify-bot へのコントリビューションを歓迎します！

## 行動規範

このプロジェクトに参加するすべての人は、お互いを尊重し、建設的なコミュニティを維持することが期待されています。

## コントリビューションの方法

### Issue の作成

バグ報告や機能提案は、Issue を作成してください。

1. 既存の Issue を検索して、重複がないか確認
2. 適切な Issue テンプレートを選択
3. テンプレートに従って必要な情報を記入

### Pull Request の作成

1. **Fork とクローン**
   ```bash
   git clone https://github.com/[your-username]/manifesto-notify-bot.git
   cd manifesto-notify-bot
   ```

2. **ブランチの作成**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **開発環境のセットアップ**
   ```bash
   cp .env.example .env
   deno task check
   ```

4. **コードの変更**
   - Evans DDD アーキテクチャに従ってください
   - TDD（テスト駆動開発）を実践してください
   - 型安全性を保ち、`as` による型キャストは使用しないでください

5. **テストの実行**
   ```bash
   deno task test
   ```

6. **コード品質チェック**
   ```bash
   deno task lint
   deno task fmt
   ```

7. **コミット**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

   コミットメッセージは以下の形式に従ってください：
   - `feat:` 新機能
   - `fix:` バグ修正
   - `docs:` ドキュメントのみの変更
   - `style:` コードの意味に影響しない変更（空白、フォーマットなど）
   - `refactor:` バグ修正や機能追加を含まないコード変更
   - `test:` テストの追加や修正
   - `chore:` ビルドプロセスやツールの変更

8. **Push と Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

   GitHub で Pull Request を作成し、PR テンプレートに従って記入してください。

## 開発ガイドライン

### コーディング規約

- Deno の標準的なスタイルガイドに従う
- シングルクォートを使用
- インデントは2スペース
- 行の最大長は100文字

### テスト

- すべての新機能にはテストを追加
- テストファーストアプローチを推奨
- テストは `*.test.ts` ファイルに記述

### アーキテクチャ

Evans DDD のレイヤードアーキテクチャに従ってください：

- **Domain層**: ビジネスロジックとドメインモデル
- **Application層**: ユースケースとアプリケーションサービス
- **Infrastructure層**: 外部システムとの連携
- **Presentation層**: HTTPハンドラーとミドルウェア

## 質問やサポート

質問がある場合は、Issue を作成するか、ディスカッションで質問してください。

## ライセンス

このプロジェクトへのコントリビューションは、GNU AGPL v3 ライセンスの下でライセンスされます。 Pull
Request を提出することで、あなたはこのライセンスに同意したものとみなされます。

また、Pull Request テンプレートにある CLA（Contributor License Agreement）への同意も必要です。
