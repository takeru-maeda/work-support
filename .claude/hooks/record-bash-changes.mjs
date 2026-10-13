#!/usr/bin/env node
/**
 * Pre / PostToolUse（Bash）: Bash で変わったファイル（sed -i、リダイレクト、生成スクリプトなど）を、
 * verify-gate の対象として記録します。実行の前後で「変更のあるファイルと更新時刻」を比べ、
 * このコマンドで新しく変わったものだけを記録します（別の作業の変更は前後で同じなので記録されない）。
 * 記録のための補助なので、Bash の実行は決して止めません。
 */
import fs from "node:fs";
import path from "node:path";

import {
  baselinePath,
  changedFilesWithMtime,
  diffChanged,
  projectRoot,
  readEvent,
  recordTouched,
} from "./lib.mjs";

const event = readEvent();
const root = projectRoot();
const file = baselinePath(event);
if (!file) process.exit(0);

const current = changedFilesWithMtime(root);
try {
  if (event.hook_event_name === "PreToolUse") {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify([...current]));
  } else {
    const before = new Map(JSON.parse(fs.readFileSync(file, "utf8")));
    fs.rmSync(file, { force: true });
    for (const rel of diffChanged(before, current)) recordTouched(event, rel);
  }
} catch {
  // 記録できなくても Bash の結果には影響させない
}
