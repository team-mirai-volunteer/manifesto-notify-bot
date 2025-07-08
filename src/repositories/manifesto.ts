import type { Manifesto } from '../types/models/manifesto.ts';

export type ManifestoRepository = {
  save(manifesto: Manifesto): Promise<void>;
  findById(id: string): Promise<Manifesto | null>;
};

export function createManifestoRepository(kv: Deno.Kv): ManifestoRepository {
  return {
    async save(manifesto: Manifesto): Promise<void> {
      await kv.set(['manifestos', manifesto.id], manifesto);
    },

    async findById(id: string): Promise<Manifesto | null> {
      const result = await kv.get<Manifesto>(['manifestos', id]);
      return result.value;
    },
  };
}
