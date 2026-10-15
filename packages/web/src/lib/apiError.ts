import { isAxiosError } from "axios";

/**
 * API が業務の確認で断ったときの文（`AppError` の応答 `{ error: "<文>" }`）を取り出します。
 * 入力の検証の失敗（`error` が文ではない）や、ほかの状態コード・通信の失敗では null を返します。
 *
 * @param error axios が投げた誤り
 * @param status 文を取り出す状態コード（既定は 400）
 * @returns 利用者に見せる文。無ければ null
 */
export const getRejectedMessage = (
  error: unknown,
  status = 400,
): string | null => {
  if (!isAxiosError(error) || error.response?.status !== status) return null;
  const data: unknown = error.response.data;
  if (typeof data !== "object" || data === null || !("error" in data)) {
    return null;
  }
  return typeof data.error === "string" ? data.error : null;
};
