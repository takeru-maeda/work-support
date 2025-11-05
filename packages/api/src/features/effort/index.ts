import { Hono } from "hono";

import { apiKeyAuthMiddleware, jwtAuthMiddleware } from "../../middleware/auth";
import {
  EffortDraft,
  EffortDraftRecord,
  EffortDraftResponse,
  EffortDraftResponseSchema,
  EffortDraftSchema,
  EffortDraftUpsertResponse,
  EffortDraftUpsertResponseSchema,
  EffortEntriesRequest,
  EffortEntriesRequestSchema,
  EffortEntriesResponse,
  EffortEntriesResponseSchema,
  EffortRequestSchema,
  EffortResponse,
  EffortResponseSchema,
} from "./types";
import { AuthenticatedUser, HonoEnv } from "../../custom-types";
import { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient } from "../../lib/supabase";
import { AppError } from "../../lib/errors";
import { Database, Tables } from "../../../../shared/src/types/db";
import {
  deleteEffortDraftService,
  getEffortDraftService,
  saveEffortRecords,
  saveStructuredEffortEntries,
  sendEffortCompletionEmailIfNeeded,
  upsertEffortDraftService,
} from "./service";
import { describeRoute, resolver, validator } from "hono-openapi";
import { Logger } from "../../lib/logger";

const gasEffort = new Hono<HonoEnv>();

gasEffort.post(
  "/",
  apiKeyAuthMiddleware,
  describeRoute({
    description: "工数を登録します",
    responses: {
      201: {
        description: "Effort data saved successfully",
        content: {
          "application/json": {
            schema: resolver(EffortResponseSchema),
          },
        },
      },
    },
  }),
  validator("json", EffortRequestSchema),
  async (c) => {
    const { date, effort } = c.req.valid("json");
    const user: AuthenticatedUser | undefined = c.get("user");
    if (!user) throw new AppError(401, "Unauthorized");

    const supabase: SupabaseClient<Database> = createSupabaseClient(c.env);
    await saveEffortRecords(supabase, user.id, new Date(date), effort);

    const response: EffortResponse = {
      message: "Effort data processed and saved successfully",
    };

    return c.json(response, 201);
  },
);

const appEffort = new Hono<HonoEnv>();
appEffort.use("*", jwtAuthMiddleware);

appEffort.post(
  "/entries",
  describeRoute({
    description: "工数を保存します",
    responses: {
      201: {
        description: "Effort entries saved successfully",
        content: {
          "application/json": {
            schema: resolver(EffortEntriesResponseSchema),
          },
        },
      },
    },
  }),
  validator("json", EffortEntriesRequestSchema),
  async (c) => {
    const user: AuthenticatedUser | undefined = c.get("user");
    if (!user) throw new AppError(401, "Unauthorized");

    const supabase: SupabaseClient<Database> = createSupabaseClient(c.env);
    const payload: EffortEntriesRequest = c.req.valid("json");
    const result = await saveStructuredEffortEntries(
      supabase,
      user.id,
      payload,
    );

    const response: EffortEntriesResponse = EffortEntriesResponseSchema.parse(
      result.response,
    );

    const accessLog: Tables<"access_logs"> = c.get("accessLog");
    const logger: Logger = c.get("logger");
    c.executionCtx.waitUntil(
      sendEffortCompletionEmailIfNeeded(
        supabase,
        c.env,
        user,
        result,
        logger,
        accessLog.id,
      ),
    );

    return c.json(response, 201);
  },
);

appEffort.get(
  "/draft",
  describeRoute({
    description: "保存済みの工数ドラフトを取得します",
    responses: {
      200: {
        description: "Draft fetch successfully",
        content: {
          "application/json": {
            schema: resolver(EffortDraftResponseSchema),
          },
        },
      },
      204: {
        description: "Draft not found",
      },
    },
  }),
  async (c) => {
    const user: AuthenticatedUser | undefined = c.get("user");
    if (!user) throw new AppError(401, "Unauthorized");

    const supabase: SupabaseClient<Database> = createSupabaseClient(c.env);
    const draft: EffortDraftRecord | null = await getEffortDraftService(
      supabase,
      user.id,
    );
    if (!draft) return c.body(null, 204);

    const response: EffortDraftResponse = EffortDraftResponseSchema.parse({
      draft: {
        entries: draft.entries,
        memo: draft.memo,
        date: draft.date,
        updated_at: draft.updated_at,
        client_updated_at: draft.client_updated_at,
      },
    });

    return c.json(response, 200);
  },
);

appEffort.put(
  "/draft",
  describeRoute({
    description: "工数ドラフトを保存します",
    responses: {
      200: {
        description: "Draft saved successfully",
        content: {
          "application/json": {
            schema: resolver(EffortDraftUpsertResponseSchema),
          },
        },
      },
    },
  }),
  validator("json", EffortDraftSchema),
  async (c) => {
    const user: AuthenticatedUser | undefined = c.get("user");
    if (!user) throw new AppError(401, "Unauthorized");

    const supabase: SupabaseClient<Database> = createSupabaseClient(c.env);
    const payload: EffortDraft = c.req.valid("json");
    const result: EffortDraftUpsertResponse = await upsertEffortDraftService(
      supabase,
      user.id,
      payload,
    );
    return c.json(EffortDraftUpsertResponseSchema.parse(result), 200);
  },
);

appEffort.delete(
  "/draft",
  describeRoute({
    description: "工数ドラフトを削除します",
    responses: {
      204: {
        description: "Draft deleted successfully",
      },
    },
  }),
  async (c) => {
    const user: AuthenticatedUser | undefined = c.get("user");
    if (!user) throw new AppError(401, "Unauthorized");

    const supabase: SupabaseClient<Database> = createSupabaseClient(c.env);
    await deleteEffortDraftService(supabase, user.id);
    return c.body(null, 204);
  },
);

const effort = new Hono<HonoEnv>();
effort.route("/", gasEffort);
effort.route("/", appEffort);

export default effort;
