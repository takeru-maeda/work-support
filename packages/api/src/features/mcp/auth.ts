import { OAuthError, OAuthErrorCode } from "@modelcontextprotocol/server";

import { verifySupabaseAccessToken } from "../../lib/jwt";
import {
  buildAuthenticatedUserFromPayload,
  isOAuthClientToken,
} from "../../middleware/auth";

import type { AuthenticatedUser, HonoEnv } from "../../customTypes";
import type {
  AuthInfo,
  OAuthTokenVerifier,
} from "@modelcontextprotocol/server";
import type { JWTPayload } from "jose";

/** web の画面のトークン（OAuth のクライアントに出したものではない）に付ける clientId */
export const WEB_CLIENT_ID = "web";

/**
 * `/mcp` の Bearer トークンを検証する verifier を作ります（SDK の `requireBearerAuth` に渡す）。
 * OAuth のクライアントのトークンも、web の画面のトークンも受け付ける（AC-mcp-03）。
 *
 * @param env 環境変数（JWT の検証に使う）
 * @returns verifier。検証に失敗したら OAuth の invalid_token を投げ、SDK が 401 にする
 */
export const createTokenVerifier = (
  env: HonoEnv["Bindings"],
): OAuthTokenVerifier => ({
  async verifyAccessToken(token: string): Promise<AuthInfo> {
    let payload: JWTPayload;
    let user: AuthenticatedUser;
    try {
      payload = await verifySupabaseAccessToken(token, env);
      user = buildAuthenticatedUserFromPayload(payload);
    } catch {
      throw new OAuthError(OAuthErrorCode.InvalidToken, "Invalid access token");
    }
    return {
      token,
      clientId: isOAuthClientToken(payload)
        ? String(payload.client_id)
        : WEB_CLIENT_ID,
      scopes: typeof payload.scope === "string" ? payload.scope.split(" ") : [],
      expiresAt: payload.exp,
      extra: { user },
    };
  },
});

/**
 * 検証済みの AuthInfo から、トークンのユーザーを取り出します。
 *
 * @param authInfo `createTokenVerifier` が返した AuthInfo
 * @returns ユーザー ID とメールアドレス
 */
export const userOf = (authInfo: AuthInfo): AuthenticatedUser =>
  authInfo.extra?.user as AuthenticatedUser;
