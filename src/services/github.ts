import type { ChangedFile } from '../types/models/manifesto.ts';

export type PullRequestInfo = {
  url: string;
  title: string;
  body: string;
  diff: string;
  changed_files: ChangedFile[];
};

export type GitHubService = {
  getPullRequest(prUrl: string): Promise<PullRequestInfo>;
};

type FetchFunction = typeof fetch;

export function createGitHubService(
  fetchFn: FetchFunction = fetch,
  githubToken?: string,
): GitHubService {
  return {
    async getPullRequest(prUrl: string): Promise<PullRequestInfo> {
      // PR URLのパース
      const match = prUrl.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)$/);
      if (!match) {
        throw new Error('Invalid GitHub PR URL');
      }

      const [, owner, repo, prNumber] = match;

      // PR情報の取得
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
      };

      // トークンが提供されている場合のみAuthorizationヘッダーを追加
      if (githubToken) {
        headers['Authorization'] = `Bearer ${githubToken}`;
      }

      console.log('Fetching PR data from:', apiUrl);
      const prResponse = await fetchFn(apiUrl, { headers });

      if (!prResponse.ok) {
        if (prResponse.status === 404) {
          throw new Error('Pull request not found');
        }
        throw new Error(`GitHub API error: ${prResponse.status}`);
      }

      const prData = await prResponse.json();

      // PR差分の取得
      const diffUrl = `${apiUrl}.diff`;
      const diffHeaders: Record<string, string> = {
        'Accept': 'application/vnd.github.v3.diff',
      };

      // トークンが提供されている場合のみAuthorizationヘッダーを追加
      if (githubToken) {
        diffHeaders['Authorization'] = `Bearer ${githubToken}`;
      }

      const diffResponse = await fetchFn(diffUrl, { headers: diffHeaders });

      if (!diffResponse.ok) {
        throw new Error(`Failed to fetch PR diff: ${diffResponse.status}`);
      }

      const diff = await diffResponse.text();

      // 差分から変更ファイル情報を抽出
      const changedFiles = extractChangedFiles(diff);

      return {
        url: prUrl,
        title: prData.title,
        body: prData.body || '',
        diff,
        changed_files: changedFiles,
      };
    },
  };
}

export function extractChangedFiles(diff: string): ChangedFile[] {
  const changedFiles: ChangedFile[] = [];
  const lines = diff.split('\n');

  let currentFile: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 新しいファイルの開始
    if (line.startsWith('diff --git')) {
      const match = line.match(/diff --git a\/(.+) b\/(.+)/);
      if (match) {
        currentFile = match[2];
      }
    } // 行範囲の情報
    else if (line.startsWith('@@') && currentFile) {
      const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (match) {
        const newStartLine = parseInt(match[3], 10);

        // @@行の後の実際の追加行を確認
        let firstAddedLine: number | null = null;
        let lastAddedLine: number | null = null;
        let currentLine = newStartLine;

        for (let j = i + 1; j < lines.length; j++) {
          const diffLine = lines[j];

          // 次のハンクまたはファイルに達したら終了
          if (diffLine.startsWith('@@') || diffLine.startsWith('diff --git')) {
            break;
          }

          // 追加行
          if (diffLine.startsWith('+') && !diffLine.startsWith('+++')) {
            if (firstAddedLine === null) {
              firstAddedLine = currentLine;
            }
            lastAddedLine = currentLine;
            currentLine++;
          } // 変更なし行
          else if (!diffLine.startsWith('-') && !diffLine.startsWith('---')) {
            currentLine++;
          }
          // 削除行はカウントしない
        }

        // 追加行がある場合のみ記録
        if (firstAddedLine !== null && lastAddedLine !== null) {
          // ハンクごとに個別のエントリとして記録（結合しない）
          changedFiles.push({
            path: currentFile,
            startLine: firstAddedLine,
            endLine: lastAddedLine,
          });
        }
      }
    }
  }

  return changedFiles;
}
