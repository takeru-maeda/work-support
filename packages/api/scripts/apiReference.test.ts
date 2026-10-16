import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  collectEndpoints,
  findUndocumentedRoutes,
  renderApiReference,
} from "./apiReference";

const DOC: string = fileURLToPath(
  new URL("../../../docs/reference/api.md", import.meta.url),
);
const BEGIN =
  "<!-- BEGIN GENERATED: pnpm api:docs で作り直す。この間は手で編集しない -->";
const END = "<!-- END GENERATED -->";

// docs/reference/api.md の自動生成の部分を、ルートの定義から作り直して比べる。
// `pnpm api:docs`（UPDATE_API_DOCS=1）のときだけ、比べずに書き込む
describe("docs/reference/api.md", () => {
  it("Hono に登録したルートは、すべて describeRoute で OpenAPI に出ている", async () => {
    expect(findUndocumentedRoutes(await collectEndpoints())).toEqual([]);
  });

  it("ルートの定義から作り直した一覧と一致する（ずれていたら pnpm api:docs）", async () => {
    const doc: string = readFileSync(DOC, "utf8");
    const begin: number = doc.indexOf(BEGIN);
    const end: number = doc.indexOf(END);
    expect(begin, `${DOC} に生成の印がありません`).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(begin);

    const generated = `\n\n${renderApiReference(await collectEndpoints())}\n`;
    if (process.env.UPDATE_API_DOCS) {
      writeFileSync(
        DOC,
        doc.slice(0, begin + BEGIN.length) + generated + doc.slice(end),
      );
      return;
    }
    expect(doc.slice(begin + BEGIN.length, end)).toBe(generated);
  });
});
