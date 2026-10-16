import {
  createMcpHandler,
  requireBearerAuth,
} from "@modelcontextprotocol/server";
import { Hono } from "hono";

import { createSupabaseClient } from "../../lib/supabase";

import { createTokenVerifier, userOf } from "./auth";
import { createMcpServer } from "./server";

import type { HonoEnv } from "../../customTypes";
import type { Context } from "hono";

/** MCP の入口のパス */
const MCP_PATH = "/mcp";

/** 保護されたリソースの情報（RFC 9728）のパス。MCP のクライアントは 401 の WWW-Authenticate からたどる */
const RESOURCE_METADATA_PATH = "/.well-known/oauth-protected-resource";

const mcp = new Hono<HonoEnv>();

/**
 * 保護されたリソースの情報を返します。認可サーバーは Supabase の OAuth 2.1 サーバー（AC-mcp-02）。
 * API の origin はリクエストの URL から取る（開発用・本番で設定を持たない）。
 */
const resourceMetadata = (c: Context<HonoEnv>) =>
  c.json({
    resource: `${new URL(c.req.url).origin}${MCP_PATH}`,
    authorization_servers: [`${c.env.SUPABASE_URL}/auth/v1`],
    bearer_methods_supported: ["header"],
  });

mcp.get(RESOURCE_METADATA_PATH, resourceMetadata);
mcp.get(`${RESOURCE_METADATA_PATH}${MCP_PATH}`, resourceMetadata);

// 状態を持たない Streamable HTTP（リクエストごとにサーバーを作る）。401 は SDK の形で返し、
// AppError を投げないので error_logs には残らない（AC-mcp-01）
mcp.all(MCP_PATH, async (c) => {
  const origin: string = new URL(c.req.url).origin;
  const gate = requireBearerAuth({
    verifier: createTokenVerifier(c.env),
    resourceMetadataUrl: `${origin}${RESOURCE_METADATA_PATH}${MCP_PATH}`,
  });
  const authInfo = await gate(c.req.raw);
  if (authInfo instanceof Response) return authInfo;

  const user = userOf(authInfo);
  c.set("user", user);
  const handler = createMcpHandler(() =>
    createMcpServer({
      supabase: createSupabaseClient(c.env),
      user,
      env: c.env,
      logger: c.get("logger"),
      accessLogId: c.get("accessLog").id,
      waitUntil: (promise) => c.executionCtx.waitUntil(promise),
    }),
  );
  return handler.fetch(c.req.raw, { authInfo });
});

export default mcp;
