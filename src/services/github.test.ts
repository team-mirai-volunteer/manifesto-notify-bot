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

  await t.step('PR差分から変更ファイル情報を抽出', async () => {
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
@@ -10,7 +10,9 @@
 # 環境政策
 
+## 新しい環境保護施策
+
 環境保護のための施策...
diff --git a/docs/guide.md b/docs/guide.md
index abc1234..def5678 100644
--- a/docs/guide.md
+++ b/docs/guide.md
@@ -5,3 +8,10 @@
 # ガイド
 
 ガイドの内容...
+
+## 追加セクション
+
+新しい内容...`,
            { status: 200 },
          ),
        );
      }

      return Promise.resolve(new Response('Not Found', { status: 404 }));
    };

    const service = createGitHubService(mockFetch);
    const result = await service.getPullRequest('https://github.com/team-mirai/policy/pull/123');

    assertEquals(result.changed_files.length, 2);

    const envFile = result.changed_files.find((f) => f.path === 'policies/environment.md');
    assertEquals(envFile?.startLine, 12);
    assertEquals(envFile?.endLine, 13);

    const guideFile = result.changed_files.find((f) => f.path === 'docs/guide.md');
    assertEquals(guideFile?.startLine, 11);
    assertEquals(guideFile?.endLine, 14);
  });

  await t.step('単一ファイルの変更を抽出', async () => {
    const mockFetch = (url: string | URL | Request) => {
      const urlString = url.toString();

      if (urlString === 'https://api.github.com/repos/team-mirai/policy/pulls/124') {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              title: '単一ファイル変更',
              number: 124,
            }),
            { status: 200 },
          ),
        );
      }

      if (urlString === 'https://api.github.com/repos/team-mirai/policy/pulls/124.diff') {
        return Promise.resolve(
          new Response(
            `diff --git a/README.md b/README.md
index 1234567..89abcdef 100644
--- a/README.md
+++ b/README.md
@@ -1,4 +1,6 @@
 # プロジェクト
 
+## 新機能追加
+
 プロジェクトの説明...`,
            { status: 200 },
          ),
        );
      }

      return Promise.resolve(new Response('Not Found', { status: 404 }));
    };

    const service = createGitHubService(mockFetch, 'test-token');
    const result = await service.getPullRequest('https://github.com/team-mirai/policy/pull/124');

    assertEquals(result.changed_files.length, 1);
    assertEquals(result.changed_files[0].path, 'README.md');
    assertEquals(result.changed_files[0].startLine, 3);
    assertEquals(result.changed_files[0].endLine, 4);
  });
});
