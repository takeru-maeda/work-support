#!/usr/bin/env node
/**
 * PostToolUse（Edit / Write / MultiEdit）: 編集したファイルを Prettier で整え、ESLint の自動修正をかけます。
 * 自動で直らない lint のエラーが残れば exit 2 でエージェントに返し、その場で直させます。
 * あわせて、verify-gate が対象を絞れるよう「このセッションで触ったファイル」として記録します。
 */
import path from "node:path";

import { FORMAT_EXT, LINT_EXT, projectRoot, readEvent, recordTouched, run, toRelative } from "./lib.mjs";

const event = readEvent();
const root = projectRoot();
const rel = toRelative(event.tool_input?.file_path, root);
if (!rel) process.exit(0);
recordTouched(event, rel);

const bin = (name) => path.join(root, "node_modules/.bin", name);
if (FORMAT_EXT.test(rel)) {
  // .prettierignore の対象（文書や生成物）はそのまま
  run(bin("prettier"), ["--write", "--ignore-unknown", "--log-level", "warn", rel], root);
}
if (LINT_EXT.test(rel)) {
  const { code, out } = run(bin("eslint"), ["--fix", "--no-warn-ignored", rel], root);
  if (code !== 0) {
    console.error(`${rel} に自動で直らない lint のエラーがあります。続ける前に直してください:\n${out}`);
    process.exit(2);
  }
}
