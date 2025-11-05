import { Hono } from "hono";
import { SupabaseClient } from "@supabase/supabase-js";

import { AuthenticatedUser, HonoEnv } from "../../custom-types";
import { jwtAuthMiddleware } from "../../middleware/auth";
import { createSupabaseClient } from "../../lib/supabase";
import {
  WeeklyReportQuery,
  WeeklyReportQuerySchema,
  WeeklyReportResponse,
  WeeklyReportResponseSchema,
  WorkRecordListQuery,
  WorkRecordListQuerySchema,
  WorkRecordListResponse,
  WorkRecordListResponseSchema,
} from "./types";
import { AppError } from "../../lib/errors";
import { Database } from "../../../../shared/src/types/db";
import { generateFormattedReport, getWorkRecordListService } from "./service";
import { describeRoute, resolver, validator } from "hono-openapi";

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
