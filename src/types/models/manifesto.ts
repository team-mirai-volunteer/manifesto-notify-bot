export type ChangedFile = {
  path: string;
  startLine: number;
  endLine: number;
};

export type Manifesto = {
  id: string;
  title: string;
  summary: string;
  diff: string;
  githubPrUrl: string;
  createdAt: Date;
  changed_files: ChangedFile[];
  is_old: boolean;
};
