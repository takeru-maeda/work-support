import { describe, expect, it } from "vitest";

import { parseEffortText } from "./service";

/**
 * GAS / Google Form からの工数のテキストの解析（docs/specs/effort-ingest-gas/spec.md の「書式」）。
 * DB に触れない部分だけをここで確かめ、保存の振る舞いは test/gas-effort.int.test.ts で確かめる
 */
describe("parseEffortText", () => {
  it("AC-effort-ingest-gas-04: ■ の行が案件、次の ■ までの ・ の行がそのタスクになる", () => {
    const text = [
      "■案件A",
      "・設計：[2]<1.5>",
      "・実装：[3]<4>",
      "■案件B",
      "・レビュー：[1]<0.5>",
    ].join("\n");

    expect(parseEffortText(text)).toEqual([
      {
        project_name: "案件A",
        taskName: "設計",
        estimated_hours: 2,
        hours: 1.5,
      },
      { project_name: "案件A", taskName: "実装", estimated_hours: 3, hours: 4 },
      {
        project_name: "案件B",
        taskName: "レビュー",
        estimated_hours: 1,
        hours: 0.5,
      },
    ]);
  });

  it("AC-effort-ingest-gas-04: 同じ内容の行は、まとめずに 2 つとも返す", () => {
    const text = "■案件A\n・設計：[2]<1>\n・設計：[2]<1>";
    expect(parseEffortText(text)).toHaveLength(2);
  });

  it("行の前後と、案件名・タスク名・括弧の中の前後の空白は無視する", () => {
    const text = "  ■  案件A  \n\t・ 設計 ：[ 2 ]< 1.5 >  ";
    expect(parseEffortText(text)).toEqual([
      {
        project_name: "案件A",
        taskName: "設計",
        estimated_hours: 2,
        hours: 1.5,
      },
    ]);
  });

  it("タスク名は、後ろが [<見積>]<実績> として読める最初の ： まで（名前の中の ： は残る）", () => {
    expect(parseEffortText("■案件A\n・設計：詳細：[2]<1>")).toEqual([
      {
        project_name: "案件A",
        taskName: "設計：詳細",
        estimated_hours: 2,
        hours: 1,
      },
    ]);
  });

  it.each([
    ["空の見積", "・設計：[]<1>", { estimated_hours: null, hours: 1 }],
    ["空の実績", "・設計：[2]<>", { estimated_hours: 2, hours: null }],
    [
      "単位の付いた値",
      "・設計：[2h]<1.5h>",
      { estimated_hours: 2, hours: 1.5 },
    ],
    ["カンマの小数", "・設計：[1,5]<2,5>", { estimated_hours: 1, hours: 2 }],
    [
      "数値でない値",
      "・設計：[abc]<xyz>",
      { estimated_hours: NaN, hours: NaN },
    ],
    ["負の値", "・設計：[-1]<-2>", { estimated_hours: -1, hours: -2 }],
  ])(
    "AC-effort-ingest-gas-06: %s は Number.parseFloat で読む",
    (_label, line, expected) => {
      const [parsed] = parseEffortText(`■案件A\n${line}`);
      expect(parsed).toMatchObject(expected);
    },
  );

  it.each([
    ["半角の :", "・設計:[2]<1>"],
    ["全角の括弧", "・設計：［2］＜1＞"],
    ["括弧の欠け", "・設計：2<1>"],
    ["> のあとの文字", "・設計：[2]<1>メモ"],
    ["] と < の間の空白", "・設計：[2] <1>"],
    ["・ で始まらない行", "設計：[2]<1>"],
  ])("AC-effort-ingest-gas-07: %s の行は読み飛ばす", (_label, line) => {
    const text = `■案件A\n${line}\n・実装：[1]<1>`;
    expect(parseEffortText(text).map((e) => e.taskName)).toEqual(["実装"]);
  });

  it("AC-effort-ingest-gas-07: 最初の案件の行より前のタスクの行は読み飛ばす", () => {
    const text = "・設計：[2]<1>\n■案件A\n・実装：[1]<1>";
    expect(parseEffortText(text).map((e) => e.taskName)).toEqual(["実装"]);
  });

  it("AC-effort-ingest-gas-07: 名前の無い案件の行（■ だけ）より後ろのタスクの行は読み飛ばす", () => {
    const text = "■案件A\n・設計：[2]<1>\n■\n・実装：[1]<1>";
    expect(parseEffortText(text).map((e) => e.taskName)).toEqual(["設計"]);
  });

  it("AC-effort-ingest-gas-07: 読めるタスクの行が無ければ空の配列", () => {
    expect(parseEffortText("")).toEqual([]);
    expect(parseEffortText("■案件A\nメモ")).toEqual([]);
  });

  it("名前が空白だけのタスクは、名前が空文字のタスクになる（既知の落とし穴）", () => {
    expect(parseEffortText("■案件A\n・ ：[1]<2>")).toEqual([
      { project_name: "案件A", taskName: "", estimated_hours: 1, hours: 2 },
    ]);
  });
});
