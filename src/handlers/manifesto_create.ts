import type { Context } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { ManifestoRepository } from '../repositories/manifesto.ts';
import type { LLMService } from '../services/llm.ts';
import type {
  CreateManifestoResponse,
  ErrorResponse,
  ListManifestoResponse,
} from '../types/api/manifesto.ts';
import type { Manifesto } from '../types/models/manifesto.ts';

const createManifestoSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  githubPrUrl: z.string().url('GitHub PR URL must be a valid URL').min(
    1,
    'GitHub PR URL is required',
  ),
});

type CreateManifestoInput = z.infer<typeof createManifestoSchema>;

const createManifestoValidator = zValidator('json', createManifestoSchema);

function createHandler(
  repo: ManifestoRepository,
  llm: LLMService,
): (c: Context) => Promise<Response> {
  return async (c: Context) => {
    try {
      const validInput = await c.req.json<CreateManifestoInput>();

      const summary = await llm.generateSummary(validInput.content);

      const manifesto: Manifesto = {
        id: crypto.randomUUID(),
        title: validInput.title,
        summary,
        content: validInput.content,
        githubPrUrl: validInput.githubPrUrl,
        createdAt: new Date(),
      };

      await repo.save(manifesto);

      const response: CreateManifestoResponse = { id: manifesto.id };
      return c.json(response, 201);
    } catch (error) {
      console.error('Error creating manifesto:', error);
      const response: ErrorResponse = { error: 'Internal server error' };
      return c.json(response, 500);
    }
  };
}

function listHandler(repo: ManifestoRepository): (c: Context) => Promise<Response> {
  return async (c: Context) => {
    try {
      const manifestos = await repo.findAll();
      const response: ListManifestoResponse = { manifestos };
      return c.json(response, 200);
    } catch (error) {
      console.error('Error listing manifestos:', error);
      const response: ErrorResponse = { error: 'Internal server error' };
      return c.json(response, 500);
    }
  };
}

export function createManifestoHandlers(
  repo: ManifestoRepository,
  llm: LLMService,
): {
  create: [typeof createManifestoValidator, (c: Context) => Promise<Response>];
  list: (c: Context) => Promise<Response>;
} {
  return {
    create: [
      createManifestoValidator,
      createHandler(repo, llm),
    ],
    list: listHandler(repo),
  };
}
