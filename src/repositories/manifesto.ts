import type { ChangedFile, Manifesto } from '../types/models/manifesto.ts';

export type ManifestoRepository = {
  save(manifesto: Manifesto): Promise<void>;
  update(manifesto: Manifesto): Promise<void>;
  findById(id: string): Promise<Manifesto | null>;
  findByPrUrl(prUrl: string): Promise<Manifesto | null>;
  findAll(): Promise<Manifesto[]>;
  findByChangedFiles(changedFiles: ChangedFile[]): Promise<Manifesto[]>;
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

    async update(manifesto: Manifesto): Promise<void> {
      await this.save(manifesto);
    },

    async findByChangedFiles(changedFiles: ChangedFile[]): Promise<Manifesto[]> {
      const allManifestos = await this.findAll();
      const matchingManifestos: Manifesto[] = [];

      for (const manifesto of allManifestos) {
        for (const queryFile of changedFiles) {
          for (const manifestoFile of manifesto.changed_files) {
            // 同じファイルパスで行範囲が重複する場合
            if (manifestoFile.path === queryFile.path) {
              const hasOverlap = queryFile.startLine <= manifestoFile.endLine &&
                queryFile.endLine >= manifestoFile.startLine;

              if (hasOverlap) {
                matchingManifestos.push(manifesto);
                break;
              }
            }
          }
          if (matchingManifestos.includes(manifesto)) {
            break;
          }
        }
      }

      return matchingManifestos;
    },
  };
}
