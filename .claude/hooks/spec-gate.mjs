#!/usr/bin/env node
/**
 * PreToolUse（Edit / Write / MultiEdit / NotebookEdit）: `packages/` の編集に、承認の根拠があるかを確かめます。
 *
 * 根拠は、`status: approved` / `in_progress` の改修の記録か、`scope:` に編集先を含む進行中の計画書です。
 * 根拠が無ければ止めずに人へ確認を求めます（XS の誤字・定数・コメントは、その場で人が許可すれば通る）。
 * 根拠があれば何も言わず、通常の権限の判定に任せます。
 */
import {
  findApproval,
  loadApprovalDocs,
  projectRoot,
  readEvent,
  toRelative,
} from "./lib.mjs";

const event = readEvent();
const root = projectRoot();
const input = event.tool_input ?? {};
const rel = toRelative(input.file_path ?? input.notebook_path, root);

if (
  rel?.startsWith("packages/") &&
  !findApproval(rel, loadApprovalDocs(root))
) {
  const reason =
    `承認済みの改修の記録が無いまま ${rel} を編集しようとしています。` +
    "機能の追加・仕様の変更・バグの修正なら、先に改修の記録（status: draft）を作って承認を得てください（autonomous-impl スキル）。" +
    "誤字・定数・コメントだけの XS なら、許可すれば編集できます（編集後に CHANGELOG.md の Unreleased へ 1 行書く）。";
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason: reason,
      },
    }),
  );
}
