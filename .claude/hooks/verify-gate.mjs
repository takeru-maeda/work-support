#!/usr/bin/env node
/**
 * Stop: 応答を終える前の品質ゲートです。このセッションで触った `packages/` のファイルについて、
 * Prettier と ESLint、触ったパッケージの型チェック、関連する単体テストを実行します。
 * 問題があれば exit 2 で終了を止め、直させます。
 *
 * - 対象は「このセッションで触ったファイル」だけ（format-on-edit と record-bash-changes の記録）。
 *   文書だけを触ったセッションや、別の作業の変更では止めない
 * - stop_hook_active のときは通す（無限に止め続けないため。強い促しであって絶対の壁ではない）
 * - DB につながるテストや E2E は CI に任せる
 */
import fs from "node:fs";
import path from "node:path";

import { FORMAT_EXT, LINT_EXT, groupByPackage, projectRoot, readEvent, run, touchedFiles } from "./lib.mjs";

const event = readEvent();
if (event.stop_hook_active) process.exit(0);

const root = projectRoot();
const touched = touchedFiles(event);
if (!touched) process.exit(0);
const files = [...touched].filter((rel) => fs.existsSync(path.join(root, rel)));
const groups = groupByPackage(files);
if (groups.size === 0) process.exit(0);

const bin = (name) => path.join(root, "node_modules/.bin", name);
const problems = [];
const targets = [...groups.values()].flat();

const formatTargets = targets.filter((f) => FORMAT_EXT.test(f));
if (formatTargets.length > 0) {
  const { code, out } = run(bin("prettier"), ["--check", "--ignore-unknown", "--log-level", "warn", ...formatTargets], root);
  if (code !== 0) problems.push(`== Prettier（整形の崩れ。pnpm format で直る） ==\n${out}`);
}
const lintTargets = targets.filter((f) => LINT_EXT.test(f));
if (lintTargets.length > 0) {
  const { code, out } = run(bin("eslint"), ["--no-warn-ignored", ...lintTargets], root);
  if (code !== 0) problems.push(`== ESLint ==\n${out}`);
}
for (const [pkg, pkgFiles] of groups) {
  const tc = run("pnpm", ["--filter", pkg, "run", "typecheck"], root);
  if (tc.code !== 0) problems.push(`== 型チェック（${pkg}） ==\n${tc.out}`);

  // 触ったファイルに関係する単体テストだけを実行する
  const rels = pkgFiles.filter((f) => /\.(ts|tsx)$/.test(f)).map((f) => path.relative(`packages/${pkg}`, f));
  if (rels.length > 0) {
    const t = run("pnpm", ["--filter", pkg, "exec", "vitest", "related", "--run", "--passWithNoTests", "--reporter=dot", ...rels], root);
    if (t.code !== 0) problems.push(`== テスト（${pkg}） ==\n${t.out}`);
  }
}

if (problems.length > 0) {
  console.error("完了前の品質ゲートで問題が見つかりました。直してから終えてください:\n");
  console.error(problems.join("\n\n"));
  console.error("\n（対象はこのセッションで触ったファイルとそのパッケージ。DB につながるテストと E2E は CI で回す）");
  process.exit(2);
}
