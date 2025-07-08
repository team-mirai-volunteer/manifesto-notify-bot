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
