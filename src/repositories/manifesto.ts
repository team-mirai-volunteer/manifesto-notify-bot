import type { Manifesto } from "../types/models/manifesto.ts";

/**
 * マニフェストリポジトリのインターフェース
 */
export type ManifestoRepository = {
  /**
   * マニフェストを保存する
   * @param manifesto 保存するマニフェスト
   */
  save(manifesto: Manifesto): Promise<void>;
  
  /**
   * IDからマニフェストを取得する
   * @param id マニフェストID
   * @returns マニフェスト（存在しない場合はnull）
   */
  findById(id: string): Promise<Manifesto | null>;
};

/**
 * Deno KVを使用したマニフェストリポジトリを作成する
 * @param kv Deno KVインスタンス
 * @returns マニフェストリポジトリ
 */
export function createManifestoRepository(kv: Deno.Kv): ManifestoRepository {
  return {
    async save(manifesto: Manifesto): Promise<void> {
      await kv.set(["manifestos", manifesto.id], manifesto);
    },
    
    async findById(id: string): Promise<Manifesto | null> {
      const result = await kv.get<Manifesto>(["manifestos", id]);
      return result.value;
    },
  };
}