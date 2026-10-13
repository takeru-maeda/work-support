/**
 * Claude Code の hook が共通で使う部品です。Node の標準モジュールだけで書き、依存を増やしません。
 * 判定のロジックは純粋関数にして、`hooks.test.mjs` で確かめます。
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** stdin の JSON イベントを読みます。読めなければ空のオブジェクトを返します。 */
export function readEvent() {
  try {
    return JSON.parse(fs.readFileSync(0, "utf8"));
  } catch {
    return {};
  }
}

/** リポジトリのルートです（`CLAUDE_PROJECT_DIR` を優先）。 */
export function projectRoot() {
  return (
    process.env.CLAUDE_PROJECT_DIR ?? path.resolve(import.meta.dirname, "../..")
  );
}

/** ルートからの相対パスにします。ルートの外なら null を返します。 */
export function toRelative(filePath, root) {
  if (!filePath) return null;
  const rel = path.relative(root, path.resolve(root, filePath));
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return rel.split(path.sep).join("/");
}

/** コマンドを実行し、終了コードと出力（標準出力 + 標準エラー）を返します。 */
export function run(cmd, args, cwd) {
  const res = spawnSync(cmd, args, { cwd, encoding: "utf8" });
  if (res.error) return { code: 127, out: String(res.error) };
  return {
    code: res.status ?? 1,
    out: `${res.stdout ?? ""}${res.stderr ?? ""}`,
  };
}

// ---------------------------------------------------------------------------
// frontmatter（改修の記録と計画書）

/** Markdown の frontmatter から `status` と `scope` を取り出します。 */
export function parseFrontmatter(text) {
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return { status: null, scope: [] };
  // 行末の YAML コメント（`status: draft    # 説明`）を外す
  const body = fm[1]
    .split("\n")
    .map((line) => line.replace(/\s+#.*$/, ""))
    .join("\n");
  const status = body.match(/^status:\s*([a-z_]+)/m)?.[1] ?? null;
  let scope = [];
  const inline = body.match(/^scope:\s*\[(.*)\]\s*$/m);
  if (inline) {
    scope = inline[1]
      .split(",")
      .map((s) => s.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  } else {
    const block = body.match(/^scope:\s*\n((?:\s+- .*\n?)+)/m);
    if (block) {
      scope = block[1]
        .split("\n")
        .map((l) =>
          l
            .trim()
            .replace(/^- /, "")
            .replace(/^["']|["']$/g, ""),
        )
        .filter(Boolean);
    }
  }
  return { status, scope };
}

const ACTIVE = new Set(["approved", "in_progress"]);

/**
 * `packages/` の編集を許す根拠（承認済みの改修の記録、または scope に含む計画書）を探します。
 * @param {string} rel 編集するファイルの相対パス
 * @param {{path: string, text: string}[]} docs 改修の記録と計画書の中身
 * @returns {string | null} 根拠になった文書のパス。無ければ null
 */
export function findApproval(rel, docs) {
  for (const doc of docs) {
    const { status, scope } = parseFrontmatter(doc.text);
    if (!ACTIVE.has(status)) continue;
    if (/^docs\/specs\/[^/]+\/changes\//.test(doc.path)) return doc.path;
    if (
      doc.path.startsWith("docs/plans/active/") &&
      scope.some((g) => path.matchesGlob(rel, g))
    ) {
      return doc.path;
    }
  }
  return null;
}

/** 改修の記録と進行中の計画書を読み込みます。 */
export function loadApprovalDocs(root) {
  const patterns = ["docs/specs/*/changes/*.md", "docs/plans/active/*.md"];
  return patterns
    .flatMap((p) => fs.globSync(p, { cwd: root }))
    .map((p) => ({
      path: p.split(path.sep).join("/"),
      text: fs.readFileSync(path.join(root, p), "utf8"),
    }));
}

// ---------------------------------------------------------------------------
// Bash コマンドの判定

/**
 * ヒアドキュメントの本文を取り除きます。本文はファイルに書き込む文章であって実行されないので、
 * 判定の対象から外す（例: 文書を書くスクリプトの中で `.dev.vars` に言及しても止めない）。
 */
export function stripHeredocs(command) {
  const lines = command.split("\n");
  const kept = [];
  let delimiter = null;
  for (const line of lines) {
    if (delimiter) {
      if (line.trim() === delimiter) delimiter = null;
      continue;
    }
    kept.push(line);
    const m = line.match(/<<-?\s*(['"]?)(\w+)\1/);
    if (m) delimiter = m[2];
  }
  return kept.join("\n");
}

/** 秘密情報のファイル（`.dev.vars`、`.env`、`.env.local` など。`.example` は除く）に触れるか。 */
export function touchesSecretFile(rawCommand) {
  const command = stripHeredocs(rawCommand);
  const re =
    /(?:^|[\s"'=/<>|;&(])(\.dev\.vars|\.env)(\.[\w.-]+)?(?=$|[\s"'|;&)>])/g;
  for (const m of command.matchAll(re)) {
    const suffix = m[2] ?? "";
    if (suffix === ".example") continue;
    return true;
  }
  return false;
}

/**
 * Bash コマンドを判定します。settings.json の deny / ask で拾いきれないもの（複合コマンドの中、
 * 秘密情報の読み方の違い、人間の未ステージの差分を消す操作）を見ます。
 * @returns {{decision: "deny" | "ask", reason: string} | null}
 */
export function judgeBash(command) {
  if (touchesSecretFile(command)) {
    return {
      decision: "deny",
      reason:
        "秘密情報のファイル（.dev.vars / .env）には触れません。項目の確認は .example を見てください。",
    };
  }
  if (/\s--no-verify\b/.test(command)) {
    return {
      decision: "deny",
      reason:
        "--no-verify で検査を飛ばさないでください。落ちた原因を直します。",
    };
  }
  if (
    /\bgit\s+push\b[^;&|]*\s(--force\b|--force-with-lease\b|-f\b)/.test(command)
  ) {
    return {
      decision: "deny",
      reason: "force push はしません。必要なら人間が行います。",
    };
  }
  // 人間は未ステージの差分で変更を確かめる。差分を消したり隠したりする操作は人に確認する
  const discard = [
    /\bgit\s+reset\s+--hard\b/,
    /\bgit\s+checkout\s+(--\s+)?\.(\s|$)/,
    /\bgit\s+restore\b(?![^;&|]*--staged)/,
    /\bgit\s+clean\b/,
    /\bgit\s+stash\b/,
  ];
  if (discard.some((re) => re.test(command))) {
    return {
      decision: "ask",
      reason:
        "作業ツリーの変更を消す・隠す操作です。人間がまだ見ていない差分が失われないか確認してください。",
    };
  }
  if (/(^|[;&|]\s*|\s)git\s+(add|mv|rm)\b/.test(command)) {
    return {
      decision: "ask",
      reason:
        "ステージしない決まりです（例外は外部スキルと skills-lock.json）。CLAUDE.md「止まって確認すること」。",
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// このセッションで触ったファイルの記録（verify-gate の対象を絞るため）

// PostToolUse と Stop で TMPDIR がずれても同じ場所を読むよう、リポジトリの中の固定のパスにする
// （/tmp のような誰でも書ける場所は使わない。node_modules/ は git の対象外）
const SESSION_DIR = path.join(
  projectRoot(),
  "node_modules/.cache/claude-hooks",
);

function safeId(id) {
  const s = String(id ?? "").replace(/[^\w-]/g, "");
  return s || null;
}

/** このセッションで触ったファイルとして記録します（失敗しても本処理を止めない）。 */
export function recordTouched(event, rel) {
  const sid = safeId(event.session_id);
  if (!sid || !rel) return;
  try {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
    fs.appendFileSync(path.join(SESSION_DIR, `${sid}.txt`), `${rel}\n`);
  } catch {
    // 記録できなくても編集は続ける
  }
}

/** このセッションで触ったファイルの相対パスの集合です。記録が無ければ null。 */
export function touchedFiles(event) {
  const sid = safeId(event.session_id);
  if (!sid) return null;
  try {
    const lines = fs
      .readFileSync(path.join(SESSION_DIR, `${sid}.txt`), "utf8")
      .split("\n");
    return new Set(lines.filter(Boolean));
  } catch {
    return null;
  }
}

/** 変更のあるファイル（未追跡を含む）と更新時刻の対応表です。Bash の前後で比べるのに使います。 */
export function changedFilesWithMtime(root) {
  let out = "";
  try {
    out = execFileSync(
      "git",
      ["status", "--porcelain", "-z", "--untracked-files=all"],
      { cwd: root, encoding: "utf8" },
    );
  } catch {
    return new Map();
  }
  const map = new Map();
  const entries = out.split("\0");
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.length < 4) continue;
    const rel = entry.slice(3);
    if (entry[0] === "R" || entry[0] === "C") i++; // 改名元のパスを読み飛ばす
    try {
      map.set(rel, fs.statSync(path.join(root, rel)).mtimeMs);
    } catch {
      // 削除されたファイル
    }
  }
  return map;
}

export function baselinePath(event) {
  const key = safeId(event.tool_use_id) ?? safeId(event.session_id);
  return key ? path.join(SESSION_DIR, `baseline_${key}.json`) : null;
}

/** 前後の対応表を比べ、新しく変わったか更新時刻が変わったファイルを返します。 */
export function diffChanged(before, after) {
  const changed = [];
  for (const [rel, mtime] of after) {
    if (before.get(rel) !== mtime) changed.push(rel);
  }
  return changed;
}

// ---------------------------------------------------------------------------
// 検査の対象

/** 触ったファイルを、検査するパッケージごとに分けます。 */
export function groupByPackage(files) {
  const groups = new Map();
  for (const rel of files) {
    const m = rel.match(/^packages\/(api|web|shared)\//);
    if (!m) continue;
    if (!groups.has(m[1])) groups.set(m[1], []);
    groups.get(m[1]).push(rel);
  }
  return groups;
}

export const LINT_EXT = /\.(ts|tsx|js|mjs)$/;
export const FORMAT_EXT = /\.(ts|tsx|js|mjs|json|css)$/;
