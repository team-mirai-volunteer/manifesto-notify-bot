/**
 * マニフェスト作成リクエスト
 */
export type CreateManifestoRequest = {
  /** マニフェストのタイトル */
  title: string;
  /** 変更内容 */
  content: string;
  /** GitHubのPR URL */
  githubPrUrl: string;
};

/**
 * マニフェスト作成レスポンス
 */
export type CreateManifestoResponse = {
  /** 作成されたマニフェストのID */
  id: string;
};

/**
 * エラーレスポンス
 */
export type ErrorResponse = {
  /** エラーメッセージ */
  error: string;
};

