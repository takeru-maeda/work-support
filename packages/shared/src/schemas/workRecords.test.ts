import { describe, expect, it } from "vitest";

import { WorkRecordListQuerySchema } from "./workRecords";

describe("WorkRecordListQuerySchema", () => {
  it("既定値は日付の新しい順、1 ページ目、20 件", () => {
    expect(WorkRecordListQuerySchema.parse({})).toEqual({
      sort: "-date",
      page: 1,
      pageSize: 20,
    });
  });

  it("案件とタスクの ID をクエリ文字列から数値に直す", () => {
    expect(
      WorkRecordListQuerySchema.parse({ projectId: "3", taskId: "7" }),
    ).toMatchObject({ projectId: 3, taskId: 7 });
  });

  it("startDate が endDate より後ろなら endDate のエラーになる", () => {
    const result = WorkRecordListQuerySchema.safeParse({
      startDate: "2026-10-14",
      endDate: "2026-10-13",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["endDate"]);
  });

  it("startDate と endDate が同じ日なら通る", () => {
    expect(
      WorkRecordListQuerySchema.safeParse({
        startDate: "2026-10-13",
        endDate: "2026-10-13",
      }).success,
    ).toBe(true);
  });

  it("日付の形式が違うものと、pageSize が 500 を超えるものは通らない", () => {
    expect(
      WorkRecordListQuerySchema.safeParse({ startDate: "2026/10/13" }).success,
    ).toBe(false);
    expect(
      WorkRecordListQuerySchema.safeParse({ pageSize: "500" }).success,
    ).toBe(true);
    expect(
      WorkRecordListQuerySchema.safeParse({ pageSize: "501" }).success,
    ).toBe(false);
  });
});
