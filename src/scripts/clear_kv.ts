#!/usr/bin/env -S deno run -A

/**
 * Deno KVのすべてのデータをクリアするスクリプト
 *
 * 使用方法:
 *   # ローカルKV（デフォルト）
 *   deno run --unstable-kv --allow-env --allow-read --allow-write src/scripts/clear_kv.ts
 *
 *   # リモートKV
 *   deno run --unstable-kv --allow-env --allow-read --allow-write src/scripts/clear_kv.ts https://api.deno.com/databases/<database-id>/connect
 *
 * または:
 *   ./src/scripts/clear_kv.ts [connection-url]
 */

async function clearAllKvData(connectionUrl?: string) {
  const target = connectionUrl || 'local KV';
  console.log(`🗑️  Clearing all data from Deno KV (${target})...\n`);

  let kv: Deno.Kv;
  try {
    kv = await Deno.openKv(connectionUrl);
  } catch (error) {
    console.error(`❌ Failed to connect to KV store: ${error.message}`);
    if (connectionUrl) {
      console.log(
        '\nMake sure the connection URL is correct and you have the necessary permissions.',
      );
      console.log(
        'For Deno Deploy KV, you may need to set DENO_KV_ACCESS_TOKEN environment variable.',
      );
    }
    return;
  }

  try {
    let deletedCount = 0;
    const entries = kv.list({ prefix: [] });

    // すべてのエントリを収集
    const keysToDelete: Deno.KvKey[] = [];
    for await (const entry of entries) {
      keysToDelete.push(entry.key);
      console.log(`Found: ${JSON.stringify(entry.key)} = ${JSON.stringify(entry.value)}`);
    }

    if (keysToDelete.length === 0) {
      console.log('\n✅ No data found in KV store. Nothing to clear.');
      kv.close();
      return;
    }

    // 確認プロンプト
    console.log(`\n⚠️  Found ${keysToDelete.length} entries to delete.`);
    const confirmation = prompt('Are you sure you want to delete all data? (yes/no): ');

    if (confirmation?.toLowerCase() !== 'yes') {
      console.log('\n❌ Operation cancelled.');
      kv.close();
      return;
    }

    // バッチで削除
    console.log('\nDeleting entries...');
    const batchSize = 10;
    for (let i = 0; i < keysToDelete.length; i += batchSize) {
      const batch = keysToDelete.slice(i, i + batchSize);
      const atomic = kv.atomic();

      for (const key of batch) {
        atomic.delete(key);
        console.log(`Deleting: ${JSON.stringify(key)}`);
      }

      await atomic.commit();
      deletedCount += batch.length;
    }

    console.log(`\n✅ Successfully deleted ${deletedCount} entries from KV store.`);
  } catch (error) {
    console.error('\n❌ Error clearing KV data:', error);
  } finally {
    kv.close();
  }
}

// スクリプトとして実行された場合のみ実行
if (import.meta.main) {
  const connectionUrl = Deno.args[0];

  // ヘルプ表示
  if (connectionUrl === '--help' || connectionUrl === '-h') {
    console.log(`
Usage: clear_kv.ts [connection-url]

Options:
  connection-url    Optional. The Deno KV connection URL.
                    If not specified, connects to local KV.
                    Example: https://api.deno.com/databases/<database-id>/connect

Examples:
  # Clear local KV
  ./src/scripts/clear_kv.ts
  
  # Clear remote KV
  ./src/scripts/clear_kv.ts https://api.deno.com/databases/abc123/connect
  
  # With environment variable for authentication
  DENO_KV_ACCESS_TOKEN=your-token ./src/scripts/clear_kv.ts https://api.deno.com/databases/abc123/connect
`);
    Deno.exit(0);
  }

  await clearAllKvData(connectionUrl);
}
