import { assertEquals, assertStringIncludes, assertRejects } from 'https://deno.land/std/testing/asserts.ts';

import { 
  createLLMService, 
  generatePolicyDiffSummaryWithFallback,
  PolicyNotificationManager,
  type LLMService 
} from './llm.ts';

// テスト用のモック設定
const mockConfig = {
  isProd: () => false,
};

// 実際のteam-miraiリポジトリのような差分データ
const SAMPLE_POLICY_DIFFS = {
  visionUpdate: `diff --git a/01_チームみらいのビジョン.md b/01_チームみらいのビジョン.md
index 1234567..abcdefg 100644
--- a/01_チームみらいのビジョン.md
+++ b/01_チームみらいのビジョン.md
@@ -15,6 +15,10 @@
 ## デジタル技術による社会変革
 
 私たちは、AIとデジタル技術を活用して、すべての人が平等にアクセスできる社会を目指します。
+
+### 具体的な取り組み
+- AIを活用した行政サービスの効率化
+- デジタルデバイドの解消に向けた支援制度
+- 高齢者向けデジタル教育プログラムの拡充
 
 ## 持続可能な成長`,

  digitalPolicyAdd: `diff --git a/10_ステップ１「デジタル時代の当たり前をやりきる」.md b/10_ステップ１「デジタル時代の当たり前をやりきる」.md
index 1234567..abcdefg 100644
--- a/10_ステップ１「デジタル時代の当たり前をやりきる」.md
+++ b/10_ステップ１「デジタル時代の当たり前をやりきる」.md
@@ -45,6 +45,15 @@
 
 ### オンライン行政サービスの拡充
 
+#### 新設：24時間対応デジタル窓口
+- 住民票、戸籍謄本などの証明書発行を24時間対応
+- AIチャットボットによる初回相談サービス
+- 多言語対応（英語、中国語、韓国語、ベトナム語）
+
+#### 申請手続きの簡素化
+- ワンストップサービスの実現
+- 書類の電子化推進
+
 デジタル技術を活用した行政サービスの効率化を図ります。`,

  minorTypoFix: `diff --git a/02_政策インデックス.md b/02_政策インデックス.md
index 1234567..abcdefg 100644
--- a/02_政策インデックス.md
+++ b/02_政策インデックス.md
@@ -3,7 +3,7 @@
 
 ## 政策一覧
 
-このマニフェストは、チームみらいの政策を体系的にまとめたものです。
+このマニフェストは、チームみらいの政策を体系的にまとめたものです。
 
 ### 主要政策分野`,

  investmentPolicyUpdate: `diff --git a/30_ステップ３「長期の成長に大胆に投資する」.md b/30_ステップ３「長期の成長に大胆に投資する」.md
index 1234567..abcdefg 100644
--- a/30_ステップ３「長期の成長に大胆に投資する」.md
+++ b/30_ステップ３「長期の成長に大胆に投資する」.md
@@ -20,8 +20,12 @@
 ### AI・量子技術分野への集中投資
 
 - 研究開発予算を現在の1.5倍に拡大
-- 産学連携の推進
-- 国際的な研究協力の強化
+- 産学連携プラットフォームの構築
+- 国際的な研究協力の強化（米国、EU、アジア諸国）
+
+### 新設：スタートアップ支援制度
+- 政府系ファンドによる初期投資支援
+- 規制緩和による迅速な事業化支援
 
 ## グリーンテクノロジー投資`,
};

Deno.test('Policy LLM Service Tests', async (t) => {
  const cleanup = () => {
    Deno.env.delete('OPENAI_API_KEY');
  };

  await t.step('開発環境でのMockPolicyLLMService動作確認', async () => {
    const service = createLLMService();
    
    const result = await service.generatePolicyDiffSummary(
      SAMPLE_POLICY_DIFFS.visionUpdate,
      'ビジョンにAI活用の具体策を追加'
    );
    
    assertStringIncludes(result, 'ビジョン');
    assertEquals(result.length <= 100, true);
    
    cleanup();
  });

  await t.step('デジタル政策の差分要約テスト', async () => {
    const service = createLLMService();
    
    const result = await service.generatePolicyDiffSummary(
      SAMPLE_POLICY_DIFFS.digitalPolicyAdd,
      'デジタル窓口の24時間対応を新設'
    );
    
    assertStringIncludes(result, 'デジタル政策');
    assertEquals(result.length <= 100, true);
    
    cleanup();
  });

  await t.step('軽微な変更（タイポ修正）の処理', async () => {
    const service = createLLMService();
    
    const result = await service.generatePolicyDiffSummary(
      SAMPLE_POLICY_DIFFS.minorTypoFix,
      'fix: 誤字の修正'
    );
    
    assertEquals(result.length <= 100, true);
    
    cleanup();
  });

  await t.step('フォールバック機能のテスト', async () => {
    const failingService: LLMService = {
      generateSummary: async () => {
        throw new Error('API Service Unavailable');
      },
      generatePolicyDiffSummary: async () => {
        throw new Error('API Service Unavailable');
      }
    };
    
    const result = await generatePolicyDiffSummaryWithFallback(
      failingService,
      SAMPLE_POLICY_DIFFS.investmentPolicyUpdate,
      '投資政策にスタートアップ支援を追加',
      1
    );
    
    assertStringIncludes(result, '政策');
    assertEquals(result.length <= 100, true);
    
    cleanup();
  });

  await t.step('PolicyNotificationManagerの通知生成テスト', async () => {
    const manager = new PolicyNotificationManager();
    
    const notification = await manager.generatePolicyUpdateNotification(
      SAMPLE_POLICY_DIFFS.digitalPolicyAdd,
      'デジタル窓口の24時間対応を新設',
      'https://github.com/team-mirai/policy/pull/123'
    );
    
    assertStringIncludes(notification, '🔔 チームみらい政策更新');
    assertStringIncludes(notification, '#チームみらい');
    assertStringIncludes(notification, 'https://github.com/team-mirai/policy/pull/123');
    
    cleanup();
  });

  await t.step('PR処理の総合テスト', async () => {
    const manager = new PolicyNotificationManager();
    
    const prData = {
      title: 'AI活用政策の拡充',
      diff: SAMPLE_POLICY_DIFFS.visionUpdate,
      url: 'https://github.com/team-mirai/policy/pull/456',
      author: 'policy-team',
      filesChanged: ['01_チームみらいのビジョン.md'],
    };
    
    const result = await manager.processPolicyPullRequest(prData);
    
    assertEquals(result.shouldNotify, true);
    assertStringIncludes(result.notification, '🔔 チームみらい政策更新');
    const summaryContainsPolicy = result.summary.includes('政策');
    const summaryContainsVision = result.summary.includes('ビジョン');
    assertEquals(summaryContainsPolicy || summaryContainsVision, true);
    assertEquals(result.summary.length <= 100, true);
    
    cleanup();
  });

  await t.step('軽微な変更の通知判定テスト', async () => {
    const manager = new PolicyNotificationManager();
    
    const prData = {
      title: 'fix: typo in policy document',
      diff: SAMPLE_POLICY_DIFFS.minorTypoFix,
      url: 'https://github.com/team-mirai/policy/pull/789',
      author: 'maintainer',
      filesChanged: ['02_政策インデックス.md'],
    };
    
    const result = await manager.processPolicyPullRequest(prData);
    
    assertEquals(result.shouldNotify, false);
    assertEquals(result.notification, '');
    
    cleanup();
  });

  await t.step('重要ファイルの変更通知判定テスト', async () => {
    const manager = new PolicyNotificationManager();
    
    const prData = {
      title: 'update digital policy',
      diff: SAMPLE_POLICY_DIFFS.digitalPolicyAdd,
      url: 'https://github.com/team-mirai/policy/pull/101',
      author: 'policy-team',
      filesChanged: ['10_ステップ１「デジタル時代の当たり前をやりきる」.md'],
    };
    
    const result = await manager.processPolicyPullRequest(prData);
    
    assertEquals(result.shouldNotify, true);
    assertStringIncludes(result.notification, '🔔 チームみらい政策更新');
    
    cleanup();
  });

  await t.step('空の差分エラーハンドリング', async () => {
    const manager = new PolicyNotificationManager();
    
    await assertRejects(
      () => manager.generatePolicyUpdateNotification('', 'Empty diff test'),
      Error,
      'Empty policy diff provided'
    );
    
    cleanup();
  });

  await t.step('100文字制限のテスト', async () => {
    const service = createLLMService();
    
    const longDiff = `diff --git a/test.md b/test.md
index 1234567..abcdefg 100644
--- a/test.md
+++ b/test.md
@@ -1,5 +1,50 @@
${'+ 非常に長い政策内容の追加行です。'.repeat(50)}`;
    
    const result = await service.generatePolicyDiffSummary(
      longDiff,
      '非常に長い政策変更'
    );
    
    assertEquals(result.length <= 100, true);
    
    cleanup();
  });
});

export async function runPolicyIntegrationTest() {
  console.log('Running policy integration test...');
  
  if (!Deno.env.get('OPENAI_API_KEY')) {
    console.log('Skipping integration test - OPENAI_API_KEY not set');
    return;
  }
  
  const manager = new PolicyNotificationManager();
  
  const testPrData = {
    title: 'デジタル政策の拡充：AI活用による行政サービス向上',
    diff: SAMPLE_POLICY_DIFFS.digitalPolicyAdd,
    url: 'https://github.com/team-mirai/policy/pull/test',
    author: 'policy-team',
    filesChanged: ['10_ステップ１「デジタル時代の当たり前をやりきる」.md'],
  };
  
  try {
    const result = await manager.processPolicyPullRequest(testPrData);
    console.log('Integration test result:', result);
  } catch (error) {
    console.error('Integration test failed:', error);
  }
}
