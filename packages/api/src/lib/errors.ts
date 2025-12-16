import { ContentfulStatusCode } from "hono/utils/http-status";

/**
 * アプリケーション固有のエラーを表します。
 */
export class AppError extends Error {
  constructor(
    public statusCode: ContentfulStatusCode,
    message: string,
    public internalError?: Error,
    public logLevel: "ERROR" | "CRITICAL" = "ERROR",
  ) {
    super(message);
  }
}
