#!/usr/bin/env node
/**
 * テーブルの全体像（docs/reference/database.md）の自動生成の部分を作ります。
 *
 * - 列・NULL の可否・ビュー・enum・関数・public 内の外部キーは、生成型 `packages/shared/src/types/db.ts` から読む
 * - db.ts に載らない主キーと、auth.users への外部キー（削除時の動き）は、マイグレーションの SQL から読む
 *   （pg_dump と同じ `ALTER TABLE ONLY ... ADD CONSTRAINT` の形だけを読む。db.ts の外部キーが SQL から
 *   見つからなければ失敗させ、読み落としに気づけるようにする）
 *
 * 文書の中の BEGIN GENERATED 〜 END GENERATED の間だけを書き換え、手書きの説明は残す。
 *
 * 使い方: node scripts/gen-db-docs.mjs          … 書き換える（pnpm db:docs）
 *         node scripts/gen-db-docs.mjs --check  … 書き換えずに比べ、ずれていれば終了コード 1（pnpm harness:check）
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(path.join(root, "package.json"));
const ts = require("typescript");

const DB_TYPES = "packages/shared/src/types/db.ts";
const MIGRATIONS = "packages/api/supabase/migrations";
const DOC = "docs/reference/database.md";
const BEGIN =
  "<!-- BEGIN GENERATED: pnpm db:docs で作り直す。この間は手で編集しない -->";
const END = "<!-- END GENERATED -->";

// ---------------------------------------------------------------------------
// db.ts を読む

function memberOf(typeLiteral, name) {
  const m = typeLiteral.members.find(
    (x) => x.name?.getText() === name || x.name?.text === name,
  );
  return m?.type;
}

function members(typeLiteral) {
  return typeLiteral && ts.isTypeLiteralNode(typeLiteral)
    ? typeLiteral.members
    : [];
}

const literalText = (node) =>
  ts.isLiteralTypeNode(node) ? node.literal.text : node.getText();
const tupleTexts = (node) =>
  node && ts.isTupleTypeNode(node) ? node.elements.map(literalText) : [];

/** 列の型を短く表す（`Database["public"]["Enums"]["log_level"]` は `log_level` に）。 */
function columnType(node) {
  const parts = ts.isUnionTypeNode(node) ? node.types : [node];
  const nullable = parts.some(
    (p) =>
      p.kind === ts.SyntaxKind.LiteralType &&
      p.literal.kind === ts.SyntaxKind.NullKeyword,
  );
  const rest = parts.filter(
    (p) =>
      !(
        p.kind === ts.SyntaxKind.LiteralType &&
        p.literal.kind === ts.SyntaxKind.NullKeyword
      ),
  );
  const text = rest
    .map((p) => {
      const t = p.getText();
      return t.match(/\["Enums"\]\["(\w+)"\]/)?.[1] ?? t;
    })
    .join(" | ");
  return { type: text, nullable };
}

function readRelations(node) {
  if (!node || !ts.isTupleTypeNode(node)) return [];
  return node.elements.map((el) => ({
    name: literalText(memberOf(el, "foreignKeyName")),
    columns: tupleTexts(memberOf(el, "columns")),
    oneToOne: memberOf(el, "isOneToOne")?.getText() === "true",
    target: literalText(memberOf(el, "referencedRelation")),
    targetColumns: tupleTexts(memberOf(el, "referencedColumns")),
  }));
}

function readDatabase() {
  const src = fs.readFileSync(path.join(root, DB_TYPES), "utf8");
  const sf = ts.createSourceFile(DB_TYPES, src, ts.ScriptTarget.Latest, true);
  const db = sf.statements.find(
    (s) => ts.isTypeAliasDeclaration(s) && s.name.text === "Database",
  );
  if (!db) throw new Error(`${DB_TYPES} に Database 型がありません`);
  const pub = memberOf(db.type, "public");
  const relations = (kind) =>
    members(memberOf(pub, kind)).map((m) => ({
      name: m.name.getText().replace(/"/g, ""),
      columns: members(memberOf(m.type, "Row")).map((c) => ({
        name: c.name.getText(),
        ...columnType(c.type),
      })),
      relations: readRelations(memberOf(m.type, "Relationships")),
    }));
  return {
    tables: relations("Tables"),
    views: relations("Views"),
    functions: members(memberOf(pub, "Functions")).map((m) => m.name.getText()),
    enums: members(memberOf(pub, "Enums")).map((m) => ({
      name: m.name.getText(),
      values: (ts.isUnionTypeNode(m.type) ? m.type.types : [m.type]).map(
        literalText,
      ),
    })),
  };
}

// ---------------------------------------------------------------------------
// マイグレーションの SQL から主キーと外部キーを読む

function readConstraints() {
  const dir = path.join(root, MIGRATIONS);
  const sql = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => fs.readFileSync(path.join(dir, f), "utf8"))
    .join("\n");
  const primaryKeys = new Map();
  for (const m of sql.matchAll(
    /ALTER TABLE ONLY "public"\."(\w+)"\s+ADD CONSTRAINT "\w+" PRIMARY KEY \(([^)]+)\)/g,
  )) {
    primaryKeys.set(
      m[1],
      m[2].split(",").map((c) => c.trim().replace(/"/g, "")),
    );
  }
  const foreignKeys = new Map();
  const fkRe =
    /ALTER TABLE ONLY "public"\."(\w+)"\s+ADD CONSTRAINT "(\w+)" FOREIGN KEY \("(\w+)"\) REFERENCES "(\w+)"\."(\w+)"\("(\w+)"\)(?: ON DELETE (CASCADE|SET NULL|SET DEFAULT|RESTRICT|NO ACTION))?/g;
  for (const m of sql.matchAll(fkRe)) {
    foreignKeys.set(m[2], {
      table: m[1],
      column: m[3],
      schema: m[4],
      target: m[5],
      targetColumn: m[6],
      onDelete: m[7] ?? "NO ACTION",
    });
  }
  return { primaryKeys, foreignKeys, columns: readColumnTypes(sql) };
}

/** SQL の型を短く表す（`"text"` → `text`、`timestamp with time zone` → `timestamptz`）。 */
function normalizeType(raw) {
  return raw
    .replace(/"/g, "")
    .replace(/^public\./, "")
    .replace(/timestamp with time zone/, "timestamptz")
    .replace(/timestamp without time zone/, "timestamp")
    .trim();
}

/**
 * 列の SQL の型と既定値を読みます（pg_dump の CREATE TABLE と、ADD COLUMN / ALTER COLUMN TYPE）。
 * @returns {Map<string, {type: string, default: string | null}>} キーは `テーブル.列`
 */
function readColumnTypes(sql) {
  const columns = new Map();
  const colRe =
    /^\s*"?(\w+)"?\s+(.+?)(?:\s+DEFAULT\s+(.+?))?(?:\s+NOT NULL)?,?$/;
  for (const m of sql.matchAll(
    /CREATE TABLE (?:IF NOT EXISTS )?"?public"?\."?(\w+)"?\s*\(([\s\S]*?)\n\);/g,
  )) {
    for (const line of m[2].split("\n")) {
      if (/^\s*(CONSTRAINT|PRIMARY|UNIQUE|CHECK|FOREIGN)\b/i.test(line))
        continue;
      const c = line.match(colRe);
      if (c)
        columns.set(`${m[1]}.${c[1]}`, {
          type: normalizeType(c[2]),
          default: c[3] ?? null,
        });
    }
  }
  for (const m of sql.matchAll(
    /ALTER TABLE (?:ONLY )?"?public"?\."?(\w+)"?\s+ADD COLUMN (?:IF NOT EXISTS )?"?(\w+)"?\s+([^;]+?)(?:\s+DEFAULT\s+([^;]+?))?(?:\s+NOT NULL)?;/g,
  )) {
    columns.set(`${m[1]}.${m[2]}`, {
      type: normalizeType(m[3]),
      default: m[4] ?? null,
    });
  }
  for (const m of sql.matchAll(
    /ALTER TABLE (?:ONLY )?"?public"?\."?(\w+)"?\s+ALTER COLUMN "?(\w+)"?\s+(?:SET DATA )?TYPE\s+([^;]+?)(?:\s+USING[^;]*)?;/g,
  )) {
    const key = `${m[1]}.${m[2]}`;
    columns.set(key, {
      type: normalizeType(m[3]),
      default: columns.get(key)?.default ?? null,
    });
  }
  for (const m of sql.matchAll(
    /ALTER TABLE (?:ONLY )?"?public"?\."?(\w+)"?\s+ALTER COLUMN "?(\w+)"?\s+ADD GENERATED (ALWAYS|BY DEFAULT) AS IDENTITY/g,
  )) {
    const key = `${m[1]}.${m[2]}`;
    if (columns.has(key))
      columns.get(key).default =
        `IDENTITY（${m[3] === "ALWAYS" ? "常に自動" : "既定で自動"}）`;
  }
  return columns;
}

/** 既定値を読みやすくする（`"now"()` → `now()`、`'API'::"public"."log_source"` → `'API'`）。 */
const prettyDefault = (d) =>
  d?.replace(/"/g, "").replace(/::[\w. ]+$/, "") ?? "";

// ---------------------------------------------------------------------------
// Markdown を組み立てる

const PARSE_HINT =
  "scripts/gen-db-docs.mjs の読み取りの形を、マイグレーションの書き方に合わせて直してください";

/** db.ts の列と外部キーに、SQL から読んだ型・既定値・外部キーを結び付けます。読めないものがあれば失敗させます。 */
function attachSql(tables, { primaryKeys, foreignKeys, columns }) {
  const fkList = [...foreignKeys.values()];
  return tables.map((t) => {
    for (const r of t.relations) {
      if (!foreignKeys.has(r.name)) {
        throw new Error(
          `外部キー ${r.name}（${t.name}）を ${MIGRATIONS} から読めませんでした。${PARSE_HINT}`,
        );
      }
    }
    const pk = new Set(primaryKeys.get(t.name) ?? []);
    const fks = fkList.filter((fk) => fk.table === t.name);
    const cols = t.columns.map((c) => {
      const sql = columns.get(`${t.name}.${c.name}`);
      if (!sql) {
        throw new Error(
          `列 ${t.name}.${c.name} の型を ${MIGRATIONS} から読めませんでした。${PARSE_HINT}`,
        );
      }
      const fk = fks.find((f) => f.column === c.name);
      return {
        ...c,
        sqlType: sql.type,
        default: prettyDefault(sql.default),
        pk: pk.has(c.name),
        fk,
      };
    });
    return { ...t, columns: cols, fks };
  });
}

const keysOf = (c, sep) =>
  [c.pk && "PK", c.fk && "FK"].filter(Boolean).join(sep);
const code = (s) => (s ? `\`${s}\`` : "");
const entity = (schema, table) =>
  schema === "public" ? table : `${schema}_${table}`;

function renderEr(tables, views) {
  const out = ["## ER 図", "", "```mermaid", "erDiagram"];
  if (tables.some((t) => t.fks.some((fk) => fk.schema === "auth"))) {
    out.push("    auth_users {", "        uuid id PK", "    }");
  }
  for (const t of tables) {
    out.push(`    ${t.name} {`);
    for (const c of t.columns) {
      // Mermaid の型には記号を使えないので、引数（numeric(4,2) の (4,2)）を外す
      const type = c.sqlType.replace(/\(.*\)/, "").replace(/\W/g, "_");
      const keys = keysOf(c, ",");
      const nullable = c.nullable ? ' "NULL 可"' : "";
      out.push(`        ${type} ${c.name}${keys ? " " + keys : ""}${nullable}`);
    }
    out.push("    }");
  }
  for (const t of tables) {
    for (const fk of t.fks) {
      const nullable = t.columns.find((c) => c.name === fk.column)?.nullable;
      const oneToOne = t.relations.find((r) =>
        r.columns.includes(fk.column),
      )?.oneToOne;
      const line = `${nullable ? "|o" : "||"}--${oneToOne ? "o|" : "o{"}`;
      out.push(
        `    ${entity(fk.schema, fk.target)} ${line} ${t.name} : "${fk.column}"`,
      );
    }
  }
  const viewNames = views.map((v) => code(v.name)).join("、");
  out.push(
    "```",
    "",
    `ビュー（${viewNames}）は ER 図に含めない。列は下の「ビュー」を参照。`,
    "",
  );
  return out;
}

function renderTables(tables) {
  const out = ["## テーブル", ""];
  for (const t of tables) {
    out.push(
      `### ${t.name}`,
      "",
      "| 列 | 型 | NULL | 既定値 | キー | 参照先（削除時） |",
      "| --- | --- | --- | --- | --- | --- |",
    );
    for (const c of t.columns) {
      const schema = c.fk && c.fk.schema !== "public" ? `${c.fk.schema}.` : "";
      const ref = c.fk
        ? `${code(`${schema}${c.fk.target}.${c.fk.targetColumn}`)}（${c.fk.onDelete}）`
        : "";
      out.push(
        `| ${code(c.name)} | ${code(c.sqlType)} | ${c.nullable ? "可" : ""} | ${code(c.default)} | ${keysOf(c, ", ")} | ${ref} |`,
      );
    }
    out.push("");
  }
  return out;
}

function renderViews(views) {
  const out = [
    "## ビュー",
    "",
    "列の型は生成型（TypeScript）の型。ビューの列は、すべて NULL になりうるものとして生成される",
    "",
  ];
  for (const v of views) {
    out.push(`### ${v.name}`, "", "| 列 | 型 | NULL |", "| --- | --- | --- |");
    for (const c of v.columns)
      out.push(
        `| ${code(c.name)} | ${code(c.type)} | ${c.nullable ? "可" : ""} |`,
      );
    out.push("");
  }
  return out;
}

function renderOthers(functions, enums) {
  return [
    "## 関数",
    "",
    ...functions.map((f) => `- ${code(f)}`),
    "",
    "## enum",
    "",
    ...enums.map((e) => `- ${code(e.name)}: ${e.values.map(code).join(" / ")}`),
  ];
}

function render({ tables, views, functions, enums }, sql) {
  const linked = attachSql(tables, sql);
  return [
    ...renderEr(linked, views),
    ...renderTables(linked),
    ...renderViews(views),
    ...renderOthers(functions, enums),
  ].join("\n");
}

// ---------------------------------------------------------------------------

const generated = render(readDatabase(), readConstraints());
const docPath = path.join(root, DOC);
const current = fs.existsSync(docPath)
  ? fs.readFileSync(docPath, "utf8")
  : null;
if (current === null || !current.includes(BEGIN) || !current.includes(END)) {
  console.error(
    `${DOC} に生成の印（BEGIN GENERATED / END GENERATED）がありません。印を戻してから実行してください`,
  );
  process.exit(1);
}
const next = current.replace(
  new RegExp(`${BEGIN}[\\s\\S]*?${END}`),
  `${BEGIN}\n\n${generated}\n\n${END}`,
);

if (process.argv.includes("--check")) {
  if (next !== current) {
    console.error(
      `${DOC} が db.ts / マイグレーションと合っていません。pnpm db:docs で作り直してください`,
    );
    process.exit(1);
  }
  console.log(`${DOC}: OK`);
} else {
  fs.writeFileSync(docPath, next);
  console.log(`${DOC} を更新しました`);
}
