import { createMiddleware } from "hono/factory";

import { EffortRequestSchema } from "../features/effort/types";
import { AppError } from "../lib/errors";
import { verifySupabaseAccessToken } from "../lib/jwt";
import { createSupabaseClient } from "../lib/supabase";

import type { Database } from "../../../shared/src/types/db";
import type { AuthenticatedUser, HonoEnv } from "../custom-types";
import type { EffortRequest } from "../features/effort/types";
import type { AuthError, SupabaseClient, User } from "@supabase/supabase-js";
import type { JWTPayload } from "jose";
import type z from "zod";

/**
 * JWT 認証を検証します（共有シークレットの HS256 と、JWKS で検証する ES256 / RS256 の両方）。
 *
 * @param c Honoコンテキスト
 * @param next 次のミドルウェア
 * @returns 認証後に実行される処理
 */
export const jwtAuthMiddleware = createMiddleware(async (c, next) => {
  // OPTIONSリクエスト（CORSプリフライト）は認証をスキップ
  if (c.req.method === "OPTIONS") {
    await next();
    return;
  }

  const authHeader: string | undefined = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ") !== true) {
    throw new AppError(401, "Unauthorized");
  }

  const token: string = authHeader.split(" ")[1];

  let payload: JWTPayload;
  try {
    payload = await verifySupabaseAccessToken(token, c.env);
  } catch (error) {
    throw new AppError(401, "Unauthorized", error as Error);
  }

  const user: AuthenticatedUser = buildAuthenticatedUserFromPayload(payload);
  c.set("user", user);
  await next();
});

/**
 * APIキー認証を検証します。
 *
 * @param c Honoコンテキスト
 * @param next 次のミドルウェア
 * @returns 認証後に実行される処理
 */
export const apiKeyAuthMiddleware = createMiddleware(async (c, next) => {
  const authHeader: string | undefined = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ") !== true) {
    throw new AppError(401, "Unauthorized");
  }

  const apiKey: string = authHeader.split(" ")[1];
  if (apiKey !== c.env.API_KEY) throw new AppError(401, "Unauthorized");

  const body = await c.req.json();
  const result: z.ZodSafeParseResult<EffortRequest> =
    EffortRequestSchema.safeParse(body);

  if (!result.success) {
    const messages = result.error.issues.map((issue) => {
      const path = issue.path?.length ? `${issue.path.join(".")}: ` : "";
      return `${path}${issue.message}`;
    });
    const errorMessage = messages.join(" | ");
    throw new AppError(400, errorMessage);
  }

  const parsed: EffortRequest = result.data;
  const email: string = parsed.email;

  if (!email) throw new AppError(400, "Email is required");

  const { user, error } = await findUserByEmail(email, c.env);
  // Auth の障害は送り手の誤りではないので 500 にする（400 だと GAS のメールで原因を取り違える）
  if (error) throw new AppError(500, "Failed to look up user", error);
  if (!user) throw new AppError(400, "User not found");

  c.set("user", user);
  await next();
});

/**
 * ユーザーをメールアドレスで検索します。
 */
const findUserByEmail = async (
  email: string,
  env: HonoEnv["Bindings"],
): Promise<{ user?: AuthenticatedUser; error?: AuthError }> => {
  const lowerEmail: string = email.toLowerCase();
  const supabase: SupabaseClient<Database> = createSupabaseClient(env);

  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) return { error };

    const found: User | undefined = data.users.find(
      (u) => u.email?.toLowerCase() === lowerEmail,
    );
    if (found) {
      return {
        user: {
          id: found.id,
          email: found.email ?? null,
        },
      };
    }
    if (data.users.length < perPage) break;
    page += 1;
  }
  return {};
};

/**
 * JWT ペイロードから認証ユーザーを構築します。
 */
const buildAuthenticatedUserFromPayload = (
  payload: JWTPayload,
): AuthenticatedUser => {
  const userId: string | undefined = payload.sub;
  if (!userId) {
    throw new AppError(401, "Unauthorized");
  }

  const email: string | null =
    typeof payload.email === "string"
      ? payload.email
      : Array.isArray(payload.email) && payload.email.length > 0
        ? String(payload.email[0])
        : null;

  return {
    id: userId,
    email,
  };
};
