/**
 * マニフェストエンティティ
 */
export type Manifesto = {
  /** 一意識別子 (UUID v4) */
  id: string;
  /** マニフェストのタイトル */
  title: string;
  /** 変更内容の要約 (OpenAI APIで生成) */
  summary: string;
  /** 変更内容 */
  content: string;
  /** 元のPRのURL */
  githubPrUrl: string;
  /** 作成日時 */
  createdAt: Date;
};