import { assertEquals } from '@std/assert';
import { extractChangedFiles } from './github.ts';

Deno.test('extractChangedFiles', async (t) => {
  await t.step('空のdiffの場合は空配列を返す', () => {
    const diff = '';
    const result = extractChangedFiles(diff);
    assertEquals(result, []);
  });

  await t.step('単一ファイルの単一ハンクでの追加', () => {
    const diff = `diff --git a/README.md b/README.md
index 1234567..abcdefg 100644
--- a/README.md
+++ b/README.md
@@ -10,6 +10,8 @@ This is a test file.
 Some existing content here.
 
 ## New Section
+This is a new line.
+Another new line.
 
 More existing content.`;

    const result = extractChangedFiles(diff);
    assertEquals(result.length, 1);
    assertEquals(result[0], {
      path: 'README.md',
      startLine: 13,
      endLine: 14,
    });
  });

  await t.step('単一ファイルの複数ハンクでの追加', () => {
    const diff = `diff --git a/test.js b/test.js
index 1234567..abcdefg 100644
--- a/test.js
+++ b/test.js
@@ -5,7 +5,9 @@ function hello() {
   console.log('hello');
 }
 
+// New comment
+
 function world() {
   console.log('world');
 }
@@ -20,4 +22,6 @@ function main() {
   hello();
   world();
 }
+
+main();`;

    const result = extractChangedFiles(diff);
    assertEquals(result.length, 2);
    assertEquals(result[0], {
      path: 'test.js',
      startLine: 8,
      endLine: 9,
    });
    assertEquals(result[1], {
      path: 'test.js',
      startLine: 25,
      endLine: 26,
    });
  });

  await t.step('複数ファイルの変更', () => {
    const diff = `diff --git a/file1.txt b/file1.txt
index 1234567..abcdefg 100644
--- a/file1.txt
+++ b/file1.txt
@@ -1,3 +1,4 @@
 Line 1
+New line in file1
 Line 2
 Line 3
diff --git a/file2.txt b/file2.txt
index 1234567..abcdefg 100644
--- a/file2.txt
+++ b/file2.txt
@@ -5,6 +5,7 @@ Content
 Content
 Content
 Content
+New line in file2
 Content
 Content`;

    const result = extractChangedFiles(diff);
    assertEquals(result.length, 2);
    assertEquals(result[0], {
      path: 'file1.txt',
      startLine: 2,
      endLine: 2,
    });
    assertEquals(result[1], {
      path: 'file2.txt',
      startLine: 8,
      endLine: 8,
    });
  });

  await t.step('削除のみのハンクは記録されない', () => {
    const diff = `diff --git a/delete.txt b/delete.txt
index 1234567..abcdefg 100644
--- a/delete.txt
+++ b/delete.txt
@@ -10,7 +10,6 @@ Line 10
 Line 11
 Line 12
 Line 13
-Deleted line
 Line 14
 Line 15
 Line 16`;

    const result = extractChangedFiles(diff);
    assertEquals(result.length, 0);
  });

  await t.step('追加と削除が混在する場合は追加行のみ記録', () => {
    const diff = `diff --git a/mixed.txt b/mixed.txt
index 1234567..abcdefg 100644
--- a/mixed.txt
+++ b/mixed.txt
@@ -5,8 +5,9 @@ Line 5
 Line 6
 Line 7
 Line 8
-Old line 9
-Old line 10
+New line 9
+New line 10
+New line 11
 Line 11
 Line 12`;

    const result = extractChangedFiles(diff);
    assertEquals(result.length, 1);
    assertEquals(result[0], {
      path: 'mixed.txt',
      startLine: 8,
      endLine: 10,
    });
  });

  await t.step('ファイル名にスペースが含まれる場合', () => {
    const diff = `diff --git a/my file.txt b/my file.txt
index 1234567..abcdefg 100644
--- a/my file.txt
+++ b/my file.txt
@@ -1,3 +1,4 @@
 Line 1
+New line
 Line 2
 Line 3`;

    const result = extractChangedFiles(diff);
    assertEquals(result.length, 1);
    assertEquals(result[0], {
      path: 'my file.txt',
      startLine: 2,
      endLine: 2,
    });
  });

  await t.step('新規ファイルの追加', () => {
    const diff = `diff --git a/new-file.md b/new-file.md
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/new-file.md
@@ -0,0 +1,5 @@
+# New File
+
+This is a completely new file.
+With multiple lines.
+All lines are additions.`;

    const result = extractChangedFiles(diff);
    assertEquals(result.length, 1);
    assertEquals(result[0], {
      path: 'new-file.md',
      startLine: 1,
      endLine: 5,
    });
  });

  await t.step('ファイルの削除は記録されない', () => {
    const diff = `diff --git a/deleted-file.txt b/deleted-file.txt
deleted file mode 100644
index 1234567..0000000
--- a/deleted-file.txt
+++ /dev/null
@@ -1,5 +0,0 @@
-Line 1
-Line 2
-Line 3
-Line 4
-Line 5`;

    const result = extractChangedFiles(diff);
    assertEquals(result.length, 0);
  });

  await t.step('バイナリファイルの変更は記録されない', () => {
    const diff = `diff --git a/image.png b/image.png
index 1234567..abcdefg 100644
Binary files a/image.png and b/image.png differ`;

    const result = extractChangedFiles(diff);
    assertEquals(result.length, 0);
  });

  await t.step('複雑な実際のdiff例', () => {
    const diff = `diff --git a/policies/environment.md b/policies/environment.md
index abc123..def456 100644
--- a/policies/environment.md
+++ b/policies/environment.md
@@ -10,7 +10,9 @@
 
 ## 基本方針
 
-私たちは、環境保護を重要な責務と考えています。
+私たちは、環境保護を重要な責務と考えています。持続可能な社会の実現に向けて、
+以下の取り組みを推進します。
+
 
 ## 具体的な取り組み
 
diff --git a/policies/education.md b/policies/education.md
index 123abc..456def 100644
--- a/policies/education.md
+++ b/policies/education.md
@@ -20,6 +20,8 @@
 
 ### 2. 教育機会の均等
 
+すべての子どもたちが質の高い教育を受けられるよう、
+教育格差の解消に取り組みます。
 - 経済的支援の充実
 - 地域格差の解消
 - オンライン教育の推進`;

    const result = extractChangedFiles(diff);
    assertEquals(result.length, 2);

    const envFile = result.find((f) => f.path === 'policies/environment.md');
    assertEquals(envFile, {
      path: 'policies/environment.md',
      startLine: 13,
      endLine: 15,
    });

    const eduFile = result.find((f) => f.path === 'policies/education.md');
    assertEquals(eduFile, {
      path: 'policies/education.md',
      startLine: 23,
      endLine: 24,
    });
  });

  await t.step('行番号が1桁の場合', () => {
    const diff = `diff --git a/small.txt b/small.txt
index 1234567..abcdefg 100644
--- a/small.txt
+++ b/small.txt
@@ -1,3 +1,4 @@
 First line
+Added line
 Second line
 Third line`;

    const result = extractChangedFiles(diff);
    assertEquals(result.length, 1);
    assertEquals(result[0], {
      path: 'small.txt',
      startLine: 2,
      endLine: 2,
    });
  });

  await t.step('コンテキスト行なしで追加のみ', () => {
    const diff = `diff --git a/add-only.txt b/add-only.txt
index 1234567..abcdefg 100644
--- a/add-only.txt
+++ b/add-only.txt
@@ -0,0 +1,3 @@
+Line 1
+Line 2
+Line 3`;

    const result = extractChangedFiles(diff);
    assertEquals(result.length, 1);
    assertEquals(result[0], {
      path: 'add-only.txt',
      startLine: 1,
      endLine: 3,
    });
  });

  await t.step('ハンクヘッダーに行数が省略されている場合', () => {
    const diff = `diff --git a/single.txt b/single.txt
index 1234567..abcdefg 100644
--- a/single.txt
+++ b/single.txt
@@ -5 +5,2 @@
 Line 5
+New line`;

    const result = extractChangedFiles(diff);
    assertEquals(result.length, 1);
    assertEquals(result[0], {
      path: 'single.txt',
      startLine: 6,
      endLine: 6,
    });
  });

  await t.step('同じファイルの連続しないハンクが結合される', () => {
    const diff = `diff --git a/gap.txt b/gap.txt
index 1234567..abcdefg 100644
--- a/gap.txt
+++ b/gap.txt
@@ -5,6 +5,7 @@
 Line 5
 Line 6
 Line 7
+Added at line 8
 Line 8
 Line 9
@@ -20,6 +21,7 @@
 Line 20
 Line 21
 Line 22
+Added at line 24
 Line 23
 Line 24`;

    const result = extractChangedFiles(diff);
    assertEquals(result.length, 2);
    assertEquals(result[0], {
      path: 'gap.txt',
      startLine: 8,
      endLine: 8,
    });
    assertEquals(result[1], {
      path: 'gap.txt',
      startLine: 24,
      endLine: 24,
    });
  });

  await t.step('ファイルパスに特殊文字が含まれる場合', () => {
    const diff = `diff --git a/src/components/@shared/Button.tsx b/src/components/@shared/Button.tsx
index 1234567..abcdefg 100644
--- a/src/components/@shared/Button.tsx
+++ b/src/components/@shared/Button.tsx
@@ -10,6 +10,7 @@ export const Button = () => {
   return (
     <button>
       Click me
+      {/* New comment */}
     </button>
   );
 };`;

    const result = extractChangedFiles(diff);
    assertEquals(result.length, 1);
    assertEquals(result[0], {
      path: 'src/components/@shared/Button.tsx',
      startLine: 13,
      endLine: 13,
    });
  });
});
