import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";

import { AppError } from "../../lib/errors";
import { createSupabaseClient } from "../../lib/supabase";
import { jwtAuthMiddleware } from "../../middleware/auth";

import { generateFormattedReport, getWorkRecordListService } from "./service";
import {
  WeeklyReportQuerySchema,
  WeeklyReportResponseSchema,
  WorkRecordListQuerySchema,
  WorkRecordListResponseSchema,
} from "./types";

import type {
  WeeklyReportQuery,
  WeeklyReportResponse,
  WorkRecordListQuery,
  WorkRecordListResponse,
} from "./types";
import type { Database } from "../../../../shared/src/types/db";
import type { AuthenticatedUser, HonoEnv } from "../../customTypes";
import type { SupabaseClient } from "@supabase/supabase-js";

const reports = new Hono<HonoEnv>();

reports.use("*", jwtAuthMiddleware);

reports.get(
  "/weekly",
  describeRoute({
    description: "週報の雛形を生成します",
    responses: {
      200: {
        description: "Weekly report generate successfully",
        content: {
          "application/json": {
            schema: resolver(WeeklyReportResponseSchema),
          },
        },
      },
    },
  }),
  validator("query", WeeklyReportQuerySchema),
  async (c) => {
    const user: AuthenticatedUser | undefined = c.get("user");
    if (!user) throw new AppError(401, "Unauthorized");

    const param: WeeklyReportQuery = c.req.valid("query");
    const supabase: SupabaseClient<Database> = createSupabaseClient(c.env);

    const report: WeeklyReportResponse = await generateFormattedReport(
      supabase,
      user.id,
      new Date(param.date),
    );
    return c.json(report, 200);
  },
);

reports.get(
  "/work-records",
  describeRoute({
    description: "工数一覧を取得します",
    responses: {
      200: {
        description: "Work records fetch successfully",
        content: {
          "application/json": {
            schema: resolver(WorkRecordListResponseSchema),
          },
        },
      },
    },
  }),
  validator("query", WorkRecordListQuerySchema),
  async (c) => {
    const user: AuthenticatedUser | undefined = c.get("user");
    if (!user) throw new AppError(401, "Unauthorized");

    const query: WorkRecordListQuery = c.req.valid("query");
    const supabase: SupabaseClient<Database> = createSupabaseClient(c.env);

    const response: WorkRecordListResponse = await getWorkRecordListService(
      supabase,
      user.id,
      query,
    );
    return c.json(WorkRecordListResponseSchema.parse(response), 200);
  },
);

export default reports;
