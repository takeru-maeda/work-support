#!/usr/bin/env node
/**
 * ハーネス（CLAUDE.md、.claude/ のスキル・ルール・エージェント、docs/ の構成）の自己点検です。
 *
 * 文書やスキルは、ファイルの移動や改名で参照先が静かに壊れます（例: rules の paths が
 * 何にもマッチしなくなり、ルールが読み込まれなくなる）。ここで機械的に検出します。
 * 失敗したら終了コード 1 で、直し方を添えて報告します。
 *
 * 使い方: node scripts/harness-check.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
);
const errors = [];
const fail = (message, fix) =>
  errors.push(fix ? `${message}\n    → 直し方: ${fix}` : message);
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

/** git が追跡しているファイルと、まだ追跡していない新規ファイルの一覧です。 */
const repoFiles = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  { cwd: root, encoding: "utf8" },
)
  .split("\n")
  .filter(Boolean);

/** Markdown の frontmatter から paths: の配列を取り出します（簡易パーサー）。 */
function frontmatterPaths(text) {
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return [];
  const block = fm[1].match(/paths:\n((?:\s+- .*\n?)+)/);
  if (!block) return [];
  return block[1]
    .split("\n")
    .map((line) =>
      line
        .trim()
        .replace(/^- /, "")
        .replace(/^["']|["']$/g, ""),
    )
    .filter(Boolean);
}

/** {a,b} を展開してから path.matchesGlob で照合します。 */
function expandBraces(pattern) {
  const m = pattern.match(/\{([^{}]+)\}/);
  if (!m) return [pattern];
  return m[1]
    .split(",")
    .flatMap((alt) => expandBraces(pattern.replace(m[0], alt)));
}
const matchesAny = (pattern) =>
  expandBraces(pattern).some((p) =>
    repoFiles.some((f) => path.matchesGlob(f, p)),
  );

// まだファイルが無いことが分かっている paths。テスト基盤（ハーネス移行計画の P4）が整ったら消す
const allowedEmptyPatterns = new Set(["packages/**/*.test.{ts,tsx}", "e2e/**"]);

// 1. .claude/rules の paths が、少なくとも 1 つのファイルにマッチするか
for (const file of fs.readdirSync(path.join(root, ".claude/rules"))) {
  if (!file.endsWith(".md")) continue;
  const rel = `.claude/rules/${file}`;
  for (const pattern of frontmatterPaths(read(rel))) {
    if (allowedEmptyPatterns.has(pattern)) continue;
    if (!matchesAny(pattern)) {
      fail(
        `${rel}: paths "${pattern}" に一致するファイルがありません（このルールは読み込まれません）`,
        "ファイルの移動に合わせて paths を直すか、不要になったルールを消す",
      );
    }
  }
}

// 2. 司令塔が呼ぶ工程スキルとエージェントがそろっているか
const orchestrator = read(".claude/skills/autonomous-impl/SKILL.md");
for (const skill of new Set(orchestrator.match(/impl-[a-z-]+/g) ?? [])) {
  if (skill === "impl-") continue;
  if (!exists(`.claude/skills/${skill}/SKILL.md`)) {
    fail(
      `autonomous-impl が参照する ${skill} のスキルがありません`,
      `.claude/skills/${skill}/SKILL.md を作るか、参照を直す`,
    );
  }
}
// 改修の記録のテンプレートのチェックリストが、司令塔の工程スキルとそろっているか
const changeTemplate = read("docs/specs/_template/change.md");
for (const skill of new Set(
  orchestrator.match(/impl-[a-z]+(?:-[a-z]+)*/g) ?? [],
)) {
  if (!changeTemplate.includes(skill)) {
    fail(
      `docs/specs/_template/change.md の工程チェックリストに ${skill} がありません`,
      "司令塔の工程表とテンプレートのチェックリストをそろえる",
    );
  }
}
for (const agent of ["bug-reviewer", "spec-reviewer"]) {
  if (!exists(`.claude/agents/${agent}.md`)) {
    fail(
      `エージェント ${agent} がありません`,
      `.claude/agents/${agent}.md を作る`,
    );
  }
}

// 3. 工程スキルが参照するパッケージ CLAUDE.md の節があるか
const requiredSections = {
  "packages/api/CLAUDE.md": [
    "開発コマンド",
    "ビルド・テスト・型チェックの鉄則",
    "参照 grep の対象パス",
    "バグ調査の入口",
    "テスト方針",
    "ドキュメントの更新先",
  ],
  "packages/web/CLAUDE.md": [
    "開発コマンド",
    "ビルド・テスト・型チェックの鉄則",
    "参照 grep の対象パス",
    "バグ調査の入口",
    "UI 変更の手順",
    "テスト方針",
    "ドキュメントの更新先",
  ],
};
for (const [rel, sections] of Object.entries(requiredSections)) {
  const text = read(rel);
  for (const section of sections) {
    if (!new RegExp(`^## ${section}$`, "m").test(text)) {
      fail(
        `${rel}: 工程スキルが参照する節「${section}」がありません`,
        "節の名前を戻すか、工程スキルの参照を直す",
      );
    }
  }
}

// 4. 指示ファイルに書かれたリポジトリ内のパスが存在するか
const instructionFiles = [
  "CLAUDE.md",
  "packages/api/CLAUDE.md",
  "packages/web/CLAUDE.md",
  ...repoFiles.filter((f) => /^\.claude\/(rules|agents)\/.+\.md$/.test(f)),
  ...repoFiles.filter((f) =>
    /^\.claude\/skills\/(autonomous-impl|impl-[a-z-]+|plan|release|steering|commit|spec-backfill)\/SKILL\.md$/.test(
      f,
    ),
  ),
];
const pathLike = /`((?:docs|packages|\.claude|scripts)\/[^`\s]+)`/g;
for (const rel of instructionFiles) {
  for (const [, ref] of read(rel).matchAll(pathLike)) {
    // プレースホルダや glob、行番号付きの参照は対象外
    if (/[<>*{}]|:: |:\d/.test(ref)) continue;
    const clean = ref.replace(/[),.]+$/, "");
    if (!exists(clean)) {
      fail(
        `${rel}: 参照しているパス ${clean} がありません`,
        "パスを直すか、参照を消す",
      );
    }
  }
}

// 5. AGENTS.md が CLAUDE.md へのシンボリックリンクになっているか
for (const dir of [".", "packages/api", "packages/web"]) {
  const link = path.join(root, dir, "AGENTS.md");
  if (
    !fs.existsSync(link) ||
    !fs.lstatSync(link).isSymbolicLink() ||
    fs.readlinkSync(link) !== "CLAUDE.md"
  ) {
    fail(
      `${dir}/AGENTS.md が CLAUDE.md へのシンボリックリンクではありません`,
      `cd ${dir} && ln -sf CLAUDE.md AGENTS.md`,
    );
  }
}

// 6. CLAUDE.md が長くなりすぎていないか（長いと指示が無視されやすくなる）
for (const rel of [
  "CLAUDE.md",
  "packages/api/CLAUDE.md",
  "packages/web/CLAUDE.md",
]) {
  const lines = read(rel).split("\n").length;
  if (lines > 150) {
    fail(
      `${rel} が ${lines} 行あります（上限 150 行）`,
      "詳細はスキル、rules、steering に移し、CLAUDE.md は地図にとどめる",
    );
  }
}

// 6b. steering が膨らんでいないか（毎回読み込まれる中核は特に）
let coreLines = 0;
for (const file of fs.readdirSync(path.join(root, "docs/steering"))) {
  if (!file.endsWith(".md")) continue;
  const lines = read(`docs/steering/${file}`).split("\n").length;
  if (lines > 200) {
    fail(
      `docs/steering/${file} が ${lines} 行あります（上限 200 行）`,
      "一覧や実装の細部、1 機能だけの話（spec.md へ）を削るか、分野ごとにファイルを分ける",
    );
  }
  if (["product.md", "tech.md", "structure.md"].includes(file))
    coreLines += lines;
}
if (coreLines > 300) {
  fail(
    `中核の steering（product / tech / structure）が合わせて ${coreLines} 行あります（上限 300 行。毎回の会話で読み込まれる）`,
    "詳細を分野ごとの steering に移し、中核は判断の軸だけにする",
  );
}

// 7. 外部スキルに入れた修正（[work-support patch]）が、更新で消えていないか
const patches = {
  ".claude/skills/shadcn/SKILL.md": {
    marker: true,
    forbidden: [/^allowed-tools:/m, /!`npx shadcn/],
  },
  ".claude/skills/web-design-guidelines/SKILL.md": {
    marker: true,
    forbidden: [/raw\.githubusercontent\.com/],
  },
  ".claude/skills/refactor/SKILL.md": {
    marker: true,
    forbidden: [
      /^\s*- (Commit current state|Commit if tests pass|Final commit)$/m,
    ],
  },
};
for (const [rel, { marker, forbidden }] of Object.entries(patches)) {
  if (!exists(rel)) continue;
  const text = read(rel);
  if (marker && !text.includes("[work-support patch]")) {
    fail(
      `${rel}: このリポジトリで入れた修正の印が消えています（npx skills update で上書きされた可能性）`,
      "docs/harness/third-party-skills.md の手順で修正を入れ直す",
    );
  }
  for (const re of forbidden) {
    if (re.test(text)) {
      fail(
        `${rel}: 外した危険な指示（${re}）が戻っています`,
        "docs/harness/third-party-skills.md の手順で修正を入れ直す",
      );
    }
  }
}

// 9. settings.json の skillOverrides が、実在するスキルを指しているか
const settings = JSON.parse(read(".claude/settings.json"));
for (const name of Object.keys(settings.skillOverrides ?? {})) {
  if (!exists(`.claude/skills/${name}/SKILL.md`)) {
    fail(
      `.claude/settings.json の skillOverrides にある ${name} のスキルがありません`,
      "スキル名を直すか、項目を消す",
    );
  }
}

// 10. settings.json の hooks が指すスクリプトがあるか（無いと hook は黙って失敗する）
for (const command of JSON.stringify(settings.hooks ?? {}).match(
  /\.claude\/hooks\/[\w.-]+/g,
) ?? []) {
  if (!exists(command)) {
    fail(
      `.claude/settings.json の hooks が参照する ${command} がありません`,
      "スクリプトを戻すか、hooks の設定を直す",
    );
  }
}

// 8. 改修の記録と計画書の status が決まった値か
const validStatus = new Set(["draft", "approved", "in_progress", "done"]);
for (const rel of repoFiles.filter((f) =>
  /^docs\/(specs\/[^_][^/]*\/changes|plans\/(active|completed))\/[^/]+\.md$/.test(
    f,
  ),
)) {
  const status = read(rel).match(/^status:\s*([a-z_]+)/m)?.[1];
  if (!validStatus.has(status)) {
    fail(
      `${rel}: status が "${status}" です（draft / approved / in_progress / done のどれか）`,
      "frontmatter の status を直す",
    );
  }
}

// 9. ファイル名が docs/steering/structure.md の「命名」に沿っているか
// shadcn の CLI が作るファイルと、機能の名前に合わせる api の結合テストは例外
const namingExceptions = [
  /^packages\/web\/src\/components\/ui\//,
  /^packages\/web\/src\/hooks\/use-mobile\.ts$/,
  /^packages\/api\/test\/[a-z-]+\.int\.test\.ts$/,
];
const kebabDir = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const camelFile = /^[a-z][A-Za-z0-9]*$/;
const pascalFile = /^[A-Z][A-Za-z0-9]*$/;
for (const rel of repoFiles.filter(
  (f) =>
    /^packages\/[^/]+\/(src|test|tests|support)\/.+\.tsx?$/.test(f) &&
    !f.endsWith(".d.ts") &&
    exists(f) &&
    !namingExceptions.some((re) => re.test(f)),
)) {
  const parts = rel.split("/");
  const [base, ...rest] = parts.at(-1).split(".");
  const dirs = parts.slice(3, -1);
  const badDir = dirs.find((d) => !kebabDir.test(d));
  // .tsx はコンポーネント（PascalCase）か、フックやテスト用の部品（camelCase）
  const isTsx = rest.at(-1) === "tsx";
  const okName = isTsx
    ? pascalFile.test(base) || camelFile.test(base)
    : camelFile.test(base);
  if (badDir || !okName) {
    fail(
      `${rel}: ${badDir ? `ディレクトリ名 "${badDir}" が kebab-case ではありません` : `ファイル名 "${base}" が命名の規約に沿っていません`}`,
      "docs/steering/structure.md の「命名」に合わせて名前を変え、参照を直す（.ts は camelCase、コンポーネントの .tsx は PascalCase）",
    );
  }
}

if (errors.length > 0) {
  console.error(`ハーネスの自己点検: ${errors.length} 件の問題\n`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log("ハーネスの自己点検: OK");
