import { createGitHubService } from '../services/github.ts';
import { createLLMService } from '../services/llm.ts';
import { createManifestoRepository } from '../repositories/manifesto.ts';
import { createNotificationHistoryRepository } from '../repositories/notification_history.ts';
import { Manifesto } from '../types/models/manifesto.ts';
import { NotificationHistory } from '../types/models/notification_history.ts';

export interface ImportPROptions {
  prUrl: string;
  githubService: ReturnType<typeof createGitHubService>;
  llmService: ReturnType<typeof createLLMService>;
  manifestoRepo: ReturnType<typeof createManifestoRepository>;
  historyRepo: ReturnType<typeof createNotificationHistoryRepository>;
}

export async function importMergedPR(options: ImportPROptions) {
  const { prUrl, githubService, llmService, manifestoRepo, historyRepo } = options;

  // 既存のマニフェストをチェック
  const existingManifesto = await manifestoRepo.findByPrUrl(prUrl);
  if (existingManifesto) {
    // 既存の履歴をチェック
    const existingHistories = await historyRepo.findByManifesto(existingManifesto.id);
    if (existingHistories.length > 0) {
      return {
        success: false,
        message: 'Manifesto and history already exist',
        manifestoId: existingManifesto.id,
      };
    }
  }

  // GitHub APIでPR情報を取得
  const pr = await githubService.getPullRequest(prUrl);

  // LLMで要約を生成
  const summary = await llmService.generateSummary(pr);

  // マニフェストを作成または更新
  const manifestoId = existingManifesto?.id || crypto.randomUUID();
  const manifesto: Manifesto = {
    id: manifestoId,
    title: pr.title,
    summary: summary,
    diff: pr.diff,
    githubPrUrl: prUrl,
    createdAt: existingManifesto?.createdAt || new Date(),
  };

  if (!existingManifesto) {
    await manifestoRepo.save(manifesto);
  }

  // 通知履歴を作成
  const historyId = crypto.randomUUID();
  const notificationHistory: NotificationHistory = {
    id: historyId,
    manifestoId: manifestoId,
    githubPrUrl: prUrl,
    platform: 'x',
    postUrl: '', // 実際には投稿しないので空文字
    postedAt: new Date(), // 現在日時を使用
  };

  await historyRepo.save(notificationHistory);

  return {
    success: true,
    manifestoId,
    historyId,
    title: pr.title,
    summary,
    postedAt: notificationHistory.postedAt,
  };
}

export function validatePRUrl(url: string): boolean {
  const prUrlPattern = /^https:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/\d+$/;
  return prUrlPattern.test(url);
}

// メイン処理
async function main() {
  // コマンドライン引数からPR URLsを取得
  const prUrls = Deno.args;

  if (prUrls.length === 0) {
    console.error(
      'Usage: deno run --unstable-kv --env-file --allow-net --allow-env --allow-read import_merged_pr.ts <PR_URL1> [PR_URL2] [PR_URL3] ...',
    );
    console.error(
      'Example: deno run --unstable-kv --env-file --allow-net --allow-env --allow-read import_merged_pr.ts https://github.com/team-mirai/policy/pull/123 https://github.com/team-mirai/policy/pull/124',
    );
    Deno.exit(1);
  }

  // PR URLの検証
  for (const prUrl of prUrls) {
    if (!validatePRUrl(prUrl)) {
      console.error(`Invalid PR URL format: ${prUrl}`);
      console.error('Expected: https://github.com/owner/repo/pull/number');
      Deno.exit(1);
    }
  }

  // 環境変数から必要な値を取得
  const isProd = Deno.env.get('OPENAI_API_KEY') ? true : false;
  if (isProd) {
    console.log('Running in production mode with OpenAI API');
  } else {
    console.log('Running in development mode (OpenAI API disabled)');
  }

  const githubToken = Deno.env.get('GITHUB_TOKEN');
  const kvUrl = Deno.env.get('KV_URL');
  const kv = await Deno.openKv(kvUrl);

  // サービスとリポジトリの初期化（DI）
  const githubService = createGitHubService(fetch, githubToken);
  const llmService = createLLMService(isProd);
  const manifestoRepo = createManifestoRepository(kv);
  const historyRepo = createNotificationHistoryRepository(kv);

  try {
    console.log(`Importing ${prUrls.length} merged PR(s)...`);

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 並列処理でPRをインポート
    const results = await Promise.allSettled(
      prUrls.map((prUrl) =>
        importMergedPR({
          prUrl,
          githubService,
          llmService,
          manifestoRepo,
          historyRepo,
        })
      ),
    );

    // 結果を整理
    const processedResults = results.map((result, index) => ({
      prUrl: prUrls[index],
      result,
    }));

    // 結果を出力
    for (const { prUrl, result } of processedResults) {
      console.log(`\n--- Processing: ${prUrl} ---`);

      if (result.status === 'fulfilled') {
        const importResult = result.value;
        if (!importResult.success) {
          console.log(`⚠️  ${importResult.message}`);
          console.log(`   Manifesto ID: ${importResult.manifestoId}`);
          skippedCount++;
        } else {
          console.log('✅ Import completed successfully!');
          console.log(`   Manifesto ID: ${importResult.manifestoId}`);
          console.log(`   Title: ${importResult.title}`);
          console.log(`   Summary: ${importResult.summary}`);
          console.log(`   History ID: ${importResult.historyId}`);
          console.log(`   Posted at: ${importResult.postedAt?.toISOString()}`);
          successCount++;
        }
      } else {
        console.error(`❌ Error importing PR: ${result.reason}`);
        errorCount++;
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total PRs: ${prUrls.length}`);
    console.log(`✅ Successfully imported: ${successCount}`);
    console.log(`⚠️  Skipped (already exists): ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    if (errorCount > 0) {
      Deno.exit(1);
    }
  } catch (error) {
    console.error('Error during import process:', error);
    Deno.exit(1);
  } finally {
    kv.close();
  }
}

// スクリプトを実行
if (import.meta.main) {
  await main();
}
