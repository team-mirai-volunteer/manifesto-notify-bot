import type { Manifesto } from '../models/manifesto.ts';

export type CreateManifestoRequest = {
  title: string;
  content: string;
  githubPrUrl: string;
};

export type CreateManifestoResponse = {
  id: string;
};

export type ErrorResponse = {
  error: string;
};

export type ListManifestoResponse = {
  manifestos: Manifesto[];
};
