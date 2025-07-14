import { assertEquals, assertRejects } from '@std/assert';
import { createGitHubService } from './github.ts';

Deno.test('GitHubサービス', async (t) => {
  await t.step('PR情報を取得', async () => {
    const mockFetch = (url: string | URL | Request) => {
      const urlString = url.toString();

      if (urlString === 'https://api.github.com/repos/team-mirai/policy/pulls/123') {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              title: '環境政策の改革',
              number: 123,
            }),
            { status: 200 },
          ),
        );
      }

      if (urlString === 'https://api.github.com/repos/team-mirai/policy/pulls/123.diff') {
        return Promise.resolve(
          new Response(
            `diff --git a/policies/environment.md b/policies/environment.md
index 1234567..89abcdef 100644
--- a/policies/environment.md
+++ b/policies/environment.md
@@ -1,3 +1,5 @@
 # 環境政策
 
+## 新しい環境保護施策
+
 環境保護のための施策...`,
            { status: 200 },
          ),
        );
      }

      return Promise.resolve(new Response('Not Found', { status: 404 }));
    };

    const service = createGitHubService(mockFetch, 'test-token');
    const result = await service.getPullRequest('https://github.com/team-mirai/policy/pull/123');

    assertEquals(result.title, '環境政策の改革');
    assertEquals(result.diff.includes('新しい環境保護施策'), true);
  });

  await t.step('無効なPR URLの場合エラー', async () => {
    const service = createGitHubService();

    await assertRejects(
      async () => await service.getPullRequest('invalid-url'),
      Error,
      'Invalid GitHub PR URL',
    );
  });

  await t.step('存在しないPRの場合エラー', async () => {
    const mockFetch = () => Promise.resolve(new Response('Not Found', { status: 404 }));
    const service = createGitHubService(mockFetch, 'test-token');

    await assertRejects(
      async () => await service.getPullRequest('https://github.com/team-mirai/policy/pull/999'),
      Error,
      'Pull request not found',
    );
  });

  await t.step('GitHub APIエラーの場合', async () => {
    const mockFetch = () => Promise.resolve(new Response('Server Error', { status: 500 }));
    const service = createGitHubService(mockFetch, 'test-token');

    await assertRejects(
      async () => await service.getPullRequest('https://github.com/team-mirai/policy/pull/123'),
      Error,
      'GitHub API error: 500',
    );
  });

  await t.step('差分取得エラーの場合', async () => {
    const mockFetch = (url: string | URL | Request) => {
      const urlString = url.toString();

      if (urlString === 'https://api.github.com/repos/team-mirai/policy/pulls/123') {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              title: '環境政策の改革',
              number: 123,
            }),
            { status: 200 },
          ),
        );
      }

      if (urlString === 'https://api.github.com/repos/team-mirai/policy/pulls/123.diff') {
        return Promise.resolve(new Response('Server Error', { status: 500 }));
      }

      return Promise.resolve(new Response('Not Found', { status: 404 }));
    };

    const service = createGitHubService(mockFetch, 'test-token');

    await assertRejects(
      async () => await service.getPullRequest('https://github.com/team-mirai/policy/pull/123'),
      Error,
      'Failed to fetch PR diff: 500',
    );
  });
});
