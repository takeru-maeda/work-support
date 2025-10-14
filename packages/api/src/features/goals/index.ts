import { Hono } from "hono";
import { SupabaseClient, User } from "@supabase/supabase-js";

import { HonoEnv } from "../../custom-types";
import { jwtAuthMiddleware } from "../../middleware/auth";
import { createSupabaseClient } from "../../lib/supabase";
import {
  CreateGoalResponseSchema,
  CreateGoalRequestSchema,
  GetGoalResponseSchema,
  GoalCreateRequest,
  GoalUpdateRequest,
  UpdateGoalResponseSchema,
  UpdateGoalRequestSchema,
} from "./types";
import { AppError } from "../../lib/errors";
import { Tables } from "../../../../shared/src/schemas/db";
import { describeRoute, resolver, validator } from "hono-openapi";
import {
  createGoalService,
  deleteGoalService,
  getLatestGoalsService,
  updateGoalService,
} from "./service";

const goals = new Hono<HonoEnv>();

goals.use("*", jwtAuthMiddleware);

goals.get(
  "/",
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
    const user: User | undefined = c.get("user");
    if (!user) throw new AppError(401, "Unauthorized");

    const supabase: SupabaseClient = createSupabaseClient(c.env);
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
    const user: User | undefined = c.get("user");
    if (!user) throw new AppError(401, "Unauthorized");

    const goal: GoalCreateRequest = c.req.valid("json");
    const supabase: SupabaseClient = createSupabaseClient(c.env);
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
    const user: User | undefined = c.get("user");
    if (!user) throw new AppError(401, "Unauthorized");

    const goalId: number = parseInt(c.req.param("id"), 10);
    const goal: GoalUpdateRequest = c.req.valid("json");
    const supabase: SupabaseClient = createSupabaseClient(c.env);
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
    description: "目標を更新します",
    responses: {
      204: {
        description: "Goal data delete successfully",
      },
    },
  }),
  async (c) => {
    const user: User | undefined = c.get("user");
    if (!user) throw new AppError(401, "Unauthorized");

    const goalId: number = parseInt(c.req.param("id"), 10);
    const supabase: SupabaseClient = createSupabaseClient(c.env);
    await deleteGoalService(supabase, user.id, goalId);
    return c.body(null, 204);
  },
);

export default goals;
