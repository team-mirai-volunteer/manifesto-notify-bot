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

  await t.step('実際のGitHub APIでpublicリポジトリにアクセス（トークンなし）', async () => {
    // まず実際にアクセス可能な公開PRを見つけるためのテスト
    // octocat/Hello-Worldは常に存在する公開リポジトリ
    const service = createGitHubService(); // トークンなし

    try {
      // octocat/Hello-Worldの最初のPRを試す
      const result = await service.getPullRequest('https://github.com/octocat/Hello-World/pull/1');
      console.log(result);

      // PRのタイトルが取得できていることを確認（内容は変わる可能性があるため存在チェックのみ）
      assertEquals(typeof result.title, 'string');
      assertEquals(result.title.length > 0, true);

      // 差分が取得できていることを確認
      assertEquals(typeof result.diff, 'string');
      // 古いPRなので差分がない可能性もある
      console.log('Successfully fetched PR info without token');
    } catch (error) {
      // APIレート制限などの場合はスキップ
      if (
        error instanceof Error &&
        (error.message.includes('403') || error.message.includes('rate limit'))
      ) {
        console.log('Skipping test due to API rate limit');
      } else {
        throw error;
      }
    }
  });
});
