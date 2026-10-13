// hook の判定ロジックのテスト。実行: node --test .claude/hooks/（pnpm harness:check に含む）
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  diffChanged,
  findApproval,
  groupByPackage,
  judgeBash,
  parseFrontmatter,
  touchesSecretFile,
} from "./lib.mjs";

const doc = (path, status, scope) => ({
  path,
  text: `---\nstatus: ${status}\n${scope ? `scope: ${scope}\n` : ""}---\n# x\n`,
});

test("frontmatter の status と scope（インラインとリストの両方）を読む", () => {
  assert.deepEqual(
    parseFrontmatter(
      '---\nstatus: in_progress\nscope: ["packages/**", "package.json"]\n---\n',
    ),
    {
      status: "in_progress",
      scope: ["packages/**", "package.json"],
    },
  );
  assert.deepEqual(
    parseFrontmatter(
      "---\nstatus: approved\nscope:\n  - packages/web/**\n---\n",
    ),
    {
      status: "approved",
      scope: ["packages/web/**"],
    },
  );
  // 計画書のテンプレートは行末にコメントを書く
  assert.deepEqual(
    parseFrontmatter(
      '---\nstatus: in_progress    # draft → done\nscope:                 # 理由\n  - "packages/**"\n  - "package.json"\n---\n',
    ),
    { status: "in_progress", scope: ["packages/**", "package.json"] },
  );
  assert.deepEqual(parseFrontmatter("# no frontmatter"), {
    status: null,
    scope: [],
  });
});

test("spec-gate: 承認済みか進行中の改修の記録があれば通す", () => {
  const rel = "packages/web/src/App.tsx";
  assert.equal(
    findApproval(rel, [
      doc("docs/specs/goals/changes/v1.0.8-x.md", "approved"),
    ]),
    "docs/specs/goals/changes/v1.0.8-x.md",
  );
  assert.equal(
    findApproval(rel, [
      doc("docs/specs/goals/changes/v1.0.8-x.md", "in_progress"),
    ]),
    "docs/specs/goals/changes/v1.0.8-x.md",
  );
});

test("spec-gate: draft や done の改修の記録では通さない", () => {
  const rel = "packages/web/src/App.tsx";
  assert.equal(
    findApproval(rel, [doc("docs/specs/goals/changes/v1.0.8-x.md", "draft")]),
    null,
  );
  assert.equal(
    findApproval(rel, [doc("docs/specs/goals/changes/v1.0.8-x.md", "done")]),
    null,
  );
  assert.equal(findApproval(rel, []), null);
});

test("spec-gate: 計画書は scope に編集先を含むときだけ通す", () => {
  const plan = doc(
    "docs/plans/active/p.md",
    "in_progress",
    '["packages/api/**"]',
  );
  assert.equal(
    findApproval("packages/api/src/index.ts", [plan]),
    "docs/plans/active/p.md",
  );
  assert.equal(findApproval("packages/web/src/App.tsx", [plan]), null);
  assert.equal(
    findApproval("packages/api/src/index.ts", [
      doc("docs/plans/active/p.md", "draft", '["packages/**"]'),
    ]),
    null,
  );
});

test("guard-bash: 秘密情報のファイルに触れるコマンドを見分ける", () => {
  for (const c of [
    "cat packages/api/.dev.vars",
    "source .env",
    "head -1 packages/web/.env.local",
    "node -e x < .dev.vars",
    "grep KEY .env",
  ]) {
    assert.equal(touchesSecretFile(c), true, c);
  }
  // ヒアドキュメントの本文（ファイルに書く文章）は実行されないので見ない。本文の外の読み取りは拾う
  assert.equal(
    touchesSecretFile("cat > a.md <<'EOF'\n.dev.vars を読まない\nEOF\necho ok"),
    false,
  );
  assert.equal(touchesSecretFile("cat > a.md <<EOF\nx\nEOF\ncat .env"), true);
  for (const c of [
    "cat packages/api/.dev.vars.example",
    "cat packages/web/.env.example",
    "cat src/types/env.d.ts",
    "echo $process.env.FOO",
    "node -e 'process.env.HOME'",
  ]) {
    assert.equal(touchesSecretFile(c), false, c);
  }
});

test("guard-bash: 止めるもの、確認するもの、通すもの", () => {
  assert.equal(judgeBash("git commit --no-verify -m x")?.decision, "deny");
  assert.equal(judgeBash("git push --force origin main")?.decision, "deny");
  assert.equal(judgeBash("git push -f")?.decision, "deny");
  assert.equal(judgeBash("cd packages/web && git add .")?.decision, "ask");
  assert.equal(judgeBash("git restore src/a.ts")?.decision, "ask");
  assert.equal(judgeBash("git checkout -- .")?.decision, "ask");
  assert.equal(judgeBash("git stash")?.decision, "ask");
  assert.equal(judgeBash("git clean -fd")?.decision, "ask");
  assert.equal(judgeBash("git restore --staged a.ts"), null);
  assert.equal(judgeBash("git status --short"), null);
  assert.equal(judgeBash("git diff HEAD -- packages"), null);
  assert.equal(judgeBash("pnpm --filter web run typecheck"), null);
  assert.equal(judgeBash("git log --oneline --all"), null);
});

test("guard-bash: DB に SQL を流すコマンドは、ローカルの Supabase（--local）だけを通す", () => {
  const local = [
    "pnpm exec supabase migration up --local --workdir packages/api",
    "pnpm exec supabase db reset --local --workdir packages/api",
    "supabase db query --local 'select 1'",
  ];
  for (const c of local) assert.equal(judgeBash(c), null, c);

  const cloud = [
    "pnpm exec supabase migration up --workdir packages/api", // フラグなしは紐付けたプロジェクトに向きうる
    "pnpm exec supabase migration up --linked",
    'supabase db reset --db-url "postgresql://x@db.example.co:5432/postgres"',
    "supabase migration up --local --linked",
    "supabase migration down --linked",
    "cd packages/api && npx supabase db reset",
  ];
  for (const c of cloud) assert.equal(judgeBash(c)?.decision, "deny", c);

  // 読むだけのコマンドや、文字列として含むだけのものは止めない
  assert.equal(
    judgeBash("pnpm exec supabase status --workdir packages/api"),
    null,
  );
  assert.equal(judgeBash("pnpm exec supabase migration list --local"), null);
  assert.equal(judgeBash('grep -rn "migration up" docs'), null);
});

test("record-bash-changes: 新しく変わったファイルと、更新時刻が変わったファイルを拾う", () => {
  const before = new Map([
    ["a.ts", 1],
    ["b.ts", 1],
  ]);
  const after = new Map([
    ["a.ts", 1],
    ["b.ts", 2],
    ["c.ts", 1],
  ]);
  assert.deepEqual(diffChanged(before, after).sort(), ["b.ts", "c.ts"]);
});

test("verify-gate: パッケージごとに分け、packages/ の外は対象にしない", () => {
  const groups = groupByPackage([
    "packages/api/src/a.ts",
    "packages/web/src/b.tsx",
    "docs/x.md",
    "packages/api/src/c.ts",
  ]);
  assert.deepEqual([...groups.keys()].sort(), ["api", "web"]);
  assert.deepEqual(groups.get("api"), [
    "packages/api/src/a.ts",
    "packages/api/src/c.ts",
  ]);
});
