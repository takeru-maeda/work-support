import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";

import { getRejectedMessage } from "./apiError";

const axiosErrorOf = (status: number, data: unknown) =>
  new AxiosError("failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data,
  });

describe("getRejectedMessage", () => {
  it("400 の { error: 文 } なら、その文", () => {
    expect(getRejectedMessage(axiosErrorOf(400, { error: "断った理由" }))).toBe(
      "断った理由",
    );
  });

  it.each([
    [
      "入力の検証の 400（error が文ではない）",
      axiosErrorOf(400, { success: false, error: { issues: [] } }),
    ],
    ["本文が無い 400", axiosErrorOf(400, null)],
    ["500", axiosErrorOf(500, { error: "Internal" })],
    ["axios の誤りではない", new Error("x")],
  ])("%s なら null", (_label, error) => {
    expect(getRejectedMessage(error)).toBeNull();
  });
});
