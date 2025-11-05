import type { HonoEnv } from "../custom-types";
import {
  EmailRequest,
  EmailRequestSchema,
  EmailResponseSchema,
} from "../../../shared/src/schemas/email";
import { AppError } from "./errors";

interface EffortEmailOptions {
  to: string;
  subject: string;
  body: string;
  accessLogId?: number;
}

/**
 * 工数登録完了メールを送信します。
 *
 * @param env 環境変数
 * @param options 送信内容
 * @returns 送信処理
 */
export const sendEffortCompletionEmail = async (
  env: HonoEnv["Bindings"],
  options: EffortEmailOptions,
): Promise<void> => {
  const requestBody: EmailRequest = EmailRequestSchema.parse({
    to: options.to,
    subject: options.subject,
    body: options.body,
    apikey: env.API_KEY,
  });

  let response: Response;
  try {
    response = await fetch(env.GAS_EMAIL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    const reason: string =
      error instanceof Error ? error.message : String(error);
    throw new AppError(
      500,
      `Failed to call mail API (accessLogId=${options.accessLogId ?? "n/a"}): ${reason}`,
      error instanceof Error ? error : undefined,
    );
  }

  let json: unknown = null;
  json = await response.json();

  if (!response.ok) {
    const parsed = EmailResponseSchema.safeParse(json);
    const errorMessage: string = parsed.success
      ? parsed.data.message
      : json && typeof json === "object" && "message" in json
        ? String((json as { message: unknown }).message)
        : `status=${response.status}`;
    throw new AppError(
      500,
      `Mail API responded with error (accessLogId=${options.accessLogId ?? "n/a"}): ${errorMessage}`,
    );
  }

  const parsed = EmailResponseSchema.safeParse(json);
  if (parsed.success && !parsed.data.success) {
    throw new AppError(
      500,
      `Mail API reported failure (accessLogId=${options.accessLogId ?? "n/a"}): ${parsed.data.message}`,
    );
  }
};
