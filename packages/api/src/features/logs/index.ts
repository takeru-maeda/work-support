import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";

import { AppError } from "../../lib/errors";
import { createSupabaseClient } from "../../lib/supabase";
import { jwtAuthMiddleware } from "../../middleware/auth";

import { createErrorLogService } from "./service";
import {
  ErrorLogCreateRequestSchema,
  ErrorLogCreateResponseSchema,
} from "./types";

import type { ErrorLogCreateRequest } from "./types";
import type { Database, Tables } from "../../../../shared/src/types/db";
import type { AuthenticatedUser, HonoEnv } from "../../customTypes";
import type { SupabaseClient } from "@supabase/supabase-js";

const logs = new Hono<HonoEnv>();

logs.use("*", jwtAuthMiddleware);

logs.post(
  "/error",
  describeRoute({
    description: "エラーログを保存します",
    responses: {
      201: {
        description: "Error log recorded successfully",
        content: {
          "application/json": {
            schema: resolver(ErrorLogCreateResponseSchema),
          },
        },
      },
    },
  }),
  validator("json", ErrorLogCreateRequestSchema),
  async (c) => {
    const user: AuthenticatedUser | undefined = c.get("user");
    if (!user) throw new AppError(401, "Unauthorized");

    const payload: ErrorLogCreateRequest = c.req.valid("json");
    const supabase: SupabaseClient<Database> = createSupabaseClient(c.env);
    const accessLog: Tables<"access_logs"> = c.get("accessLog");

    const resolvedUserAgent: string | null =
      payload.userAgent ?? c.req.header("user-agent") ?? null;

    const record = await createErrorLogService(supabase, accessLog.id, {
      ...payload,
      userAgent: resolvedUserAgent,
      clientContext: payload.clientContext ?? null,
    });

    return c.json(
      ErrorLogCreateResponseSchema.parse({
        id: record.id,
        recordedAt: record.timestamp,
      }),
      201,
    );
  },
);

export default logs;
