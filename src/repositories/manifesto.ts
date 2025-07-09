import type { Manifesto } from '../types/models/manifesto.ts';

export type ManifestoRepository = {
  save(manifesto: Manifesto): Promise<void>;
  findById(id: string): Promise<Manifesto | null>;
  findByPrUrl(prUrl: string): Promise<Manifesto | null>;
  findAll(): Promise<Manifesto[]>;
};

export function createManifestoRepository(kv: Deno.Kv): ManifestoRepository {
  return {
    async save(manifesto: Manifesto): Promise<void> {
      // トランザクションで両方のキーに保存
      const atomic = kv.atomic();
      atomic.set(['manifestos', 'by-id', manifesto.id], manifesto);
      atomic.set(['manifestos', 'by-pr-url', encodeURIComponent(manifesto.githubPrUrl)], manifesto);
      await atomic.commit();
    },

    async findById(id: string): Promise<Manifesto | null> {
      const result = await kv.get<Manifesto>(['manifestos', 'by-id', id]);
      return result.value;
    },

    async findByPrUrl(prUrl: string): Promise<Manifesto | null> {
      const result = await kv.get<Manifesto>([
        'manifestos',
        'by-pr-url',
        encodeURIComponent(prUrl),
      ]);
      return result.value;
    },

    async findAll(): Promise<Manifesto[]> {
      const manifestos: Manifesto[] = [];
      for await (const entry of kv.list<Manifesto>({ prefix: ['manifestos', 'by-id'] })) {
        manifestos.push(entry.value);
      }
      return manifestos;
    },
  };
}
