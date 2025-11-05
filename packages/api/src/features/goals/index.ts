import { Hono } from "hono";
import { SupabaseClient } from "@supabase/supabase-js";

import { AuthenticatedUser, HonoEnv } from "../../custom-types";
import { jwtAuthMiddleware } from "../../middleware/auth";
import { createSupabaseClient } from "../../lib/supabase";
import {
  CreateGoalResponseSchema,
  CreateGoalRequestSchema,
  GetGoalResponseSchema,
  GoalCreateRequest,
  GoalHistoryQuery,
  GoalHistoryQuerySchema,
  GoalHistoryResponse,
  GoalHistoryResponseSchema,
  GoalPreviousWeekProgress,
  GoalPreviousWeekProgressSchema,
  GoalPreviousWeekQuery,
  GoalPreviousWeekQuerySchema,
  GoalUpdateRequest,
  UpdateGoalResponseSchema,
  UpdateGoalRequestSchema,
} from "./types";
import { AppError } from "../../lib/errors";
import { Database, Tables } from "../../../../shared/src/types/db";
import { describeRoute, resolver, validator } from "hono-openapi";
import {
  createGoalService,
  deleteGoalService,
  getLatestGoalsService,
  getPreviousWeekProgressService,
  searchGoalsService,
  updateGoalService,
} from "./service";

const goals = new Hono<HonoEnv>();

goals.use("*", jwtAuthMiddleware);

goals.get(
  "/current",
  describeRoute({
    description: "最新の目標のリストを取得します",
    responses: {
      200: {
        description: "Goal data fetch successfully",
        content: {
          "application/json": {
            schema: resolver(GetGoalResponseSchema),
          },
        },
      },
    },
  }),
  async (c) => {
    const user: AuthenticatedUser | undefined = c.get("user");
    if (!user) throw new AppError(401, "Unauthorized");

    const supabase: SupabaseClient<Database> = createSupabaseClient(c.env);
    const latestGoals: Tables<"goals">[] = await getLatestGoalsService(
      supabase,
      user.id,
    );
    return c.json(GetGoalResponseSchema.parse({ goals: latestGoals }), 200);
  },
);

goals.post(
  "/",
  describeRoute({
    description: "目標を新規作成します",
    responses: {
      201: {
        description: "Goal data create successfully",
        content: {
          "application/json": {
            schema: resolver(CreateGoalResponseSchema),
          },
        },
      },
    },
  }),
  validator("json", CreateGoalRequestSchema),
  async (c) => {
    const user: AuthenticatedUser | undefined = c.get("user");
    if (!user) throw new AppError(401, "Unauthorized");

    const goal: GoalCreateRequest = c.req.valid("json");
    const supabase: SupabaseClient<Database> = createSupabaseClient(c.env);
    const createdGoal: Tables<"goals"> = await createGoalService(
      supabase,
      user.id,
      goal,
    );
    return c.json(
      CreateGoalResponseSchema.parse({ created: createdGoal }),
      201,
    );
  },
);

goals.put(
  "/:id",
  describeRoute({
    description: "目標を更新します",
    responses: {
      200: {
        description: "Goal data update successfully",
        content: {
          "application/json": {
            schema: resolver(UpdateGoalResponseSchema),
          },
        },
      },
    },
  }),
  validator("json", UpdateGoalRequestSchema),
  async (c) => {
    const user: AuthenticatedUser | undefined = c.get("user");
    if (!user) throw new AppError(401, "Unauthorized");

    const goalId: number = Number.parseInt(c.req.param("id"), 10);
    const goal: GoalUpdateRequest = c.req.valid("json");
    const supabase: SupabaseClient<Database> = createSupabaseClient(c.env);
    const updatedGoal: Tables<"goals"> = await updateGoalService(
      supabase,
      user.id,
      goalId,
      goal,
    );
    return c.json(
      UpdateGoalResponseSchema.parse({ updated: updatedGoal }),
      200,
    );
  },
);

goals.delete(
  "/:id",
  describeRoute({
    description: "目標を削除します",
    responses: {
      204: {
        description: "Goal data delete successfully",
      },
    },
  }),
  async (c) => {
    const user: AuthenticatedUser | undefined = c.get("user");
    if (!user) throw new AppError(401, "Unauthorized");

    const goalId: number = Number.parseInt(c.req.param("id"), 10);
    const supabase: SupabaseClient<Database> = createSupabaseClient(c.env);
    await deleteGoalService(supabase, user.id, goalId);
    return c.body(null, 204);
  },
);

goals.get(
  "/progress/previous-week",
  describeRoute({
    description: "前週末時点の最新進捗率を取得します",
    responses: {
      200: {
        description: "Previous week progress fetch successfully",
        content: {
          "application/json": {
            schema: resolver(GoalPreviousWeekProgressSchema),
          },
        },
      },
    },
  }),
  validator("query", GoalPreviousWeekQuerySchema),
  async (c) => {
    const user: AuthenticatedUser | undefined = c.get("user");
    if (!user) throw new AppError(401, "Unauthorized");

    const query: GoalPreviousWeekQuery = c.req.valid("query");
    const supabase: SupabaseClient<Database> = createSupabaseClient(c.env);

    const result: GoalPreviousWeekProgress =
      await getPreviousWeekProgressService(
        supabase,
        user.id,
        query.referenceDate,
      );

    return c.json(GoalPreviousWeekProgressSchema.parse(result), 200);
  },
);

goals.get(
  "/history",
  describeRoute({
    description: "過去の目標を検索します",
    responses: {
      200: {
        description: "Goal history fetch successfully",
        content: {
          "application/json": {
            schema: resolver(GoalHistoryResponseSchema),
          },
        },
      },
    },
  }),
  validator("query", GoalHistoryQuerySchema),
  async (c) => {
    const user: AuthenticatedUser | undefined = c.get("user");
    if (!user) throw new AppError(401, "Unauthorized");

    const query: GoalHistoryQuery = c.req.valid("query");
    const supabase: SupabaseClient<Database> = createSupabaseClient(c.env);

    const { items, total } = await searchGoalsService(supabase, user.id, query);

    const totalPages = total === 0 ? 0 : Math.ceil(total / query.pageSize);

    const response: GoalHistoryResponse = {
      items,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages,
      },
      aggregations: {
        totalCount: total,
      },
    };

    return c.json(GoalHistoryResponseSchema.parse(response), 200);
  },
);

export default goals;
