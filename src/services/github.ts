export type PullRequestInfo = {
  title: string;
  diff: string;
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

      return {
        title: prData.title,
        diff,
      };
    },
  };
}
