import { describe, expect, it, vi } from "vitest";

import { AppError } from "../../lib/errors";

import {
  parseEffortText,
  saveEffortRecords,
  saveStructuredEffortEntries,
} from "./service";

import type { Database } from "../../../../shared/src/types/db";
import type { Logger } from "../../lib/logger";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * GAS / Google Form からの工数のテキストの解析（docs/specs/effort-ingest-gas/spec.md の「書式」）。
 * DB に触れない部分だけをここで確かめ、保存の振る舞いは test/gas-effort.int.test.ts で確かめる
 */
const HOURS_REASON =
  "は 0 以上 100 未満の、小数第 2 位までの数値にしてください";

/** 呼ばれた error を確かめられるロガーの偽物 */
const fakeLogger = () =>
  ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(async () => {}),
    critical: vi.fn(),
  }) as unknown as Logger & { error: ReturnType<typeof vi.fn> };

/** 1 行の誤りだけを読む（テキストは「■案件A」の下にタスクの行を 1 つ置いたもの） */
const errorsOfTaskLine = (line: string) =>
  parseEffortText(`■案件A\n${line}`).errors;

describe("parseEffortText", () => {
  describe("読める書式", () => {
    it("AC-effort-ingest-gas-04: ■ の行が案件、次の ■ までの ・ の行がそのタスクになる", () => {
      const text = [
        "■案件A",
        "・設計：[2]<1.5>",
        "・実装：[3]<4>",
        "■案件B",
        "・レビュー：[1]<0.5>",
      ].join("\n");

      expect(parseEffortText(text)).toEqual({
        efforts: [
          {
            project_name: "案件A",
            taskName: "設計",
            estimated_hours: 2,
            hours: 1.5,
          },
          {
            project_name: "案件A",
            taskName: "実装",
            estimated_hours: 3,
            hours: 4,
          },
          {
            project_name: "案件B",
            taskName: "レビュー",
            estimated_hours: 1,
            hours: 0.5,
          },
        ],
        errors: [],
      });
    });

    it("AC-effort-ingest-gas-04: 同じ内容の行は、まとめずに 2 つとも返す", () => {
      const text = "■案件A\n・設計：[2]<1>\n・設計：[2]<1>";
      expect(parseEffortText(text).efforts).toHaveLength(2);
    });

    it("行の前後と、案件名・タスク名・括弧の中の前後の空白は無視する。空の行は読み飛ばす", () => {
      const text = "\n  ■  案件A  \n   \n\t・ 設計 ：[ 2 ]< 1.5 >  \n";
      expect(parseEffortText(text)).toEqual({
        efforts: [
          {
            project_name: "案件A",
            taskName: "設計",
            estimated_hours: 2,
            hours: 1.5,
          },
        ],
        errors: [],
      });
    });

    it("タスク名は、後ろが [<見積>]<実績> として読める最初の ： まで（名前の中の ： は残る）", () => {
      expect(parseEffortText("■案件A\n・設計：詳細：[2]<1>").efforts).toEqual([
        {
          project_name: "案件A",
          taskName: "設計：詳細",
          estimated_hours: 2,
          hours: 1,
        },
      ]);
    });

    it.each([
      ["空の見積は見積なし", "[]<1>", { estimated_hours: null, hours: 1 }],
      ["空の実績は 0", "[2]<>", { estimated_hours: 2, hours: 0 }],
      [
        "小数第 2 位まで",
        "[0.25]<99.99>",
        { estimated_hours: 0.25, hours: 99.99 },
      ],
      ["0", "[0]<0>", { estimated_hours: 0, hours: 0 }],
      [
        "全角の数字とピリオドは半角に直す",
        "[２．５]<１０>",
        { estimated_hours: 2.5, hours: 10 },
      ],
    ])("AC-effort-ingest-gas-06: %s", (_label, values, expected) => {
      const { efforts, errors } = parseEffortText(`■案件A\n・設計：${values}`);
      expect(errors).toEqual([]);
      expect(efforts[0]).toMatchObject(expected);
    });

    it("AC-effort-ingest-gas-05: 大文字小文字だけが違う名前もそのまま返す（まとめるのは保存の側でもしない）", () => {
      const text = "■ABC\n・Review：[]<1>\n■abc\n・review：[]<2>";
      expect(
        parseEffortText(text).efforts.map((e) => [e.project_name, e.taskName]),
      ).toEqual([
        ["ABC", "Review"],
        ["abc", "review"],
      ]);
    });

    it("AC-effort-ingest-gas-07: 誤りが無くタスクの行も無ければ、どちらも空", () => {
      expect(parseEffortText("")).toEqual({ efforts: [], errors: [] });
      expect(parseEffortText("■案件A\n\n")).toEqual({
        efforts: [],
        errors: [],
      });
    });
  });

  describe("誤り（AC-effort-ingest-gas-07）", () => {
    it.each([
      ["メモの行", "メモ", "案件の行（■）でもタスクの行（・）でもありません"],
      [
        "・ の無いタスク",
        "設計：[2]<1>",
        "案件の行（■）でもタスクの行（・）でもありません",
      ],
      ["半角の :", "・設計:[2]<1>", "タスクの行の書式が正しくありません"],
      [
        "全角の括弧",
        "・設計：［2］＜1＞",
        "タスクの行の書式が正しくありません",
      ],
      ["括弧の欠け", "・設計：2<1>", "タスクの行の書式が正しくありません"],
      [
        "> のあとの文字",
        "・設計：[2]<1>メモ",
        "タスクの行の書式が正しくありません",
      ],
      [
        "] と < の間の空白",
        "・設計：[2] <1>",
        "タスクの行の書式が正しくありません",
      ],
      ["> のあとの >", "・設計：[2]<1>>", "タスクの行の書式が正しくありません"],
      [
        "> のあとの文字と >",
        "・設計：[2]<1>メモ>",
        "タスクの行の書式が正しくありません",
      ],
      [
        "見積の括弧の中の ]",
        "・設計：[2]メモ]<1>",
        "タスクの行の書式が正しくありません",
      ],
      ["名前が空白だけのタスク", "・ ：[1]<2>", "タスク名がありません"],
      ["・ の直後が ：", "・：[1]<2>", "タスク名がありません"],
    ])("%s", (_label, line, reason) => {
      expect(errorsOfTaskLine(line)).toEqual([{ line: 2, reason }]);
    });

    it.each([
      ["カンマの小数", "1,5"],
      ["単位付き", "1.5h"],
      ["文字", "abc"],
      ["負の値", "-1"],
      ["先頭の小数点", ".5"],
      ["100", "100"],
      ["小数第 3 位", "99.995"],
      ["小数点が 2 つ", "1.2.3"],
    ])("AC-effort-ingest-gas-06: 見積が%sなら誤り", (_label, value) => {
      expect(errorsOfTaskLine(`・設計：[${value}]<1>`)).toEqual([
        { line: 2, reason: `見積${HOURS_REASON}` },
      ]);
    });

    it("AC-effort-ingest-gas-06: 実績の誤りも同じ。見積と実績の両方が誤りなら、見積の理由だけを出す", () => {
      expect(errorsOfTaskLine("・設計：[1]<-1>")).toEqual([
        { line: 2, reason: `実績${HOURS_REASON}` },
      ]);
      expect(errorsOfTaskLine("・設計：[abc]<xyz>")).toEqual([
        { line: 2, reason: `見積${HOURS_REASON}` },
      ]);
    });

    it("名前が空の案件の行（■ だけ）は誤り。その後ろのタスクの行は、別には報告しない", () => {
      const text =
        "■案件A\n・設計：[2]<1>\n■\n・実装：[1]<1>\n■案件B\n・会議：[1]<1>";
      expect(parseEffortText(text).errors).toEqual([
        { line: 3, reason: "案件名がありません" },
      ]);
    });

    it("■ だけの行の後ろでも、タスクの行の書式の誤りは報告する", () => {
      const text = "■\n・実装:[1]<1>";
      expect(parseEffortText(text).errors).toEqual([
        { line: 1, reason: "案件名がありません" },
        { line: 2, reason: "タスクの行の書式が正しくありません" },
      ]);
    });

    it("最初の案件の行より前のタスクの行は誤り", () => {
      const text = "・設計：[2]<1>\n■案件A\n・実装：[1]<1>";
      expect(parseEffortText(text).errors).toEqual([
        { line: 1, reason: "最初の案件の行より前にタスクの行があります" },
      ]);
    });

    it("誤りのある行をすべて、行番号の順に返す", () => {
      const text = [
        "■案件A",
        "・設計：[2]<1>",
        "メモ",
        "",
        "・実装：[x]<1>",
      ].join("\n");
      expect(parseEffortText(text).errors.map((e) => e.line)).toEqual([3, 5]);
    });
  });
});

describe("saveEffortRecords", () => {
  /** どのメソッドを呼んでも失敗する Supabase のクライアントの偽物 */
  const untouchableClient = () => {
    const touched = vi.fn();
    const client = new Proxy(
      {},
      {
        get: (_target, prop) => {
          touched(prop);
          throw new Error(`DB に触れた: ${String(prop)}`);
        },
      },
    ) as SupabaseClient<Database>;
    return { client, touched };
  };

  it("AC-effort-ingest-gas-07 / INV-5: 誤りがあれば、DB に触れずに 400 を投げる。メッセージは行番号と理由を ' / ' でつなぐ", async () => {
    const { client, touched } = untouchableClient();
    const text = "■案件A\n・設計：[2]<1>\nメモ\n・実装：[1]<1,5>";

    const error = await saveEffortRecords(
      client,
      "user-id",
      new Date("2026-10-13"),
      text,
      fakeLogger(),
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(400);
    expect((error as AppError).message).toBe(
      `工数のテキストに読めない行があります。 3行目: 案件の行（■）でもタスクの行（・）でもありません / 4行目: 実績${HOURS_REASON}`,
    );
    expect(touched).not.toHaveBeenCalled();
  });

  it("AC-effort-ingest-gas-07: 誤りが無くタスクの行も無ければ、DB に触れずに 0 件の 400", async () => {
    const { client, touched } = untouchableClient();

    const error = await saveEffortRecords(
      client,
      "user-id",
      new Date("2026-10-13"),
      "■案件A",
      fakeLogger(),
    ).catch((e: unknown) => e);

    expect((error as AppError).message).toBe(
      "工数の値が不正です。登録件数が0件でした。",
    );
    expect(touched).not.toHaveBeenCalled();
  });
});

describe("保存と候補の一覧の作り直し（effort-entry v1.1.3）", () => {
  const savedRow = (overrides: Record<string, unknown> = {}) => ({
    entry_id: 1,
    project_id: 10,
    project_name: "案件A",
    task_id: 20,
    task_name: "設計",
    hours: 1,
    estimated_hours: null,
    project_created: true,
    task_created: true,
    ...overrides,
  });

  /** save_work_records は成功し、候補の一覧の作り直しだけが失敗するクライアントの偽物 */
  const fakeClient = (rows: unknown[]) => {
    const rpc = vi.fn(async (name: string) =>
      name === "save_work_records"
        ? { data: rows, error: null }
        : { data: null, error: { message: "refresh failed", code: "XX000" } },
    );
    return { client: { rpc } as unknown as SupabaseClient<Database>, rpc };
  };

  it("AC-effort-ingest-gas-04 / INV-5: 読めたすべての行を、1 回の save_work_records で保存する", async () => {
    const { client, rpc } = fakeClient([savedRow(), savedRow()]);

    await saveEffortRecords(
      client,
      "user-id",
      new Date("2026-10-13T00:00:00Z"),
      "■案件A\n・設計：[2]<1>\n・実装：[]<0.5>",
      fakeLogger(),
    );

    const saveCalls = rpc.mock.calls.filter(
      ([name]) => name === "save_work_records",
    );
    expect(saveCalls).toEqual([
      [
        "save_work_records",
        {
          p_user_id: "user-id",
          p_work_date: "2026-10-13",
          p_entries: [
            expect.objectContaining({
              project_name: "案件A",
              task_name: "設計",
              estimated_hours: 2,
              hours: 1,
            }),
            expect.objectContaining({
              project_name: "案件A",
              task_name: "実装",
              estimated_hours: null,
              hours: 0.5,
            }),
          ],
        },
      ],
    ]);
  });

  it("AC-effort-entry-07: 候補の一覧の作り直しに失敗しても保存の成功として返し、error_logs に残す", async () => {
    const { client } = fakeClient([savedRow()]);
    const logger = fakeLogger();

    const result = await saveStructuredEffortEntries(
      client,
      "user-id",
      {
        date: "2026-10-13",
        entries: [
          {
            project_id: null,
            project_name: "案件A",
            task_id: null,
            task_name: "設計",
            estimated_hours: null,
            hours: 1,
          },
        ],
        memo: null,
      },
      logger,
    );

    expect(result.response.saved).toHaveLength(1);
    expect(result.createdProjects).toEqual(["案件A"]);
    expect(result.createdTasks).toEqual([
      { projectName: "案件A", taskName: "設計" },
    ]);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("refresh failed"),
      expect.anything(),
    );
  });

  it("AC-effort-ingest-gas-05: GAS の取り込みでも、作り直しの失敗は保存の成功として扱い、error_logs に残す", async () => {
    const { client } = fakeClient([savedRow()]);
    const logger = fakeLogger();

    await expect(
      saveEffortRecords(
        client,
        "user-id",
        new Date("2026-10-13T00:00:00Z"),
        "■案件A\n・設計：[2]<1>",
        logger,
      ),
    ).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });

  it("新しく作った案件・タスクが無ければ、候補の一覧を作り直さない", async () => {
    const { client, rpc } = fakeClient([
      savedRow({ project_created: false, task_created: false }),
    ]);

    await saveEffortRecords(
      client,
      "user-id",
      new Date("2026-10-13T00:00:00Z"),
      "■案件A\n・設計：[2]<1>",
      fakeLogger(),
    );

    expect(rpc.mock.calls.map(([name]) => name)).toEqual(["save_work_records"]);
  });
});
