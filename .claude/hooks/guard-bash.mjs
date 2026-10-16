#!/usr/bin/env node
/**
 * PreToolUse（Bash）: 危ない Bash コマンドを止めるか、人に確認を求めます。
 * 判定の中身は lib.mjs の judgeBash（settings.json の deny / ask を補うもの）。
 */
import { judgeBash, readEvent } from "./lib.mjs";

const event = readEvent();
const verdict = judgeBash(event.tool_input?.command ?? "");
if (verdict) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: verdict.decision,
        permissionDecisionReason: verdict.reason,
      },
    }),
  );
}
