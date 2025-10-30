import { Hono } from "hono";
import { SupabaseClient } from "@supabase/supabase-js";

import { AuthenticatedUser, HonoEnv } from "../../custom-types";
import { jwtAuthMiddleware } from "../../middleware/auth";
import { createSupabaseClient } from "../../lib/supabase";
import { getMissionService, upsertMissionService } from "./service";
import {
  GetMissionResponseSchema,
  MissionUpdateRequest,
  UpdateMissionRequestSchema,
  UpdateMissionResponseSchema,
} from "./types";
import { AppError } from "../../lib/errors";
import { Database, Tables } from "../../../../shared/src/types/db";
import { describeRoute, resolver, validator } from "hono-openapi";

const missions = new Hono<HonoEnv>();

missions.use("*", jwtAuthMiddleware);

missions.get(
  "/",
  describeRoute({
    description: "ミッションを取得します",
    responses: {
      200: {
        description: "Mission data fetch successfully",
        content: {
          "application/json": {
            schema: resolver(GetMissionResponseSchema),
          },
        },
      },
    },
  }),
  async (c) => {
    const user: AuthenticatedUser | undefined = c.get("user");
    if (!user) throw new AppError(401, "Unauthorized");

    const supabase: SupabaseClient<Database> = createSupabaseClient(c.env);

    const mission: Tables<"missions"> | null = await getMissionService(
      supabase,
      user.id,
    );
    return c.json(GetMissionResponseSchema.parse({ mission: mission }), 200);
  },
);

missions.put(
  "/",
  describeRoute({
    description: "ミッションを更新します",
    responses: {
      200: {
        description: "Mission data update successfully",
        content: {
          "application/json": {
            schema: resolver(UpdateMissionResponseSchema),
          },
        },
      },
    },
  }),
  validator("json", UpdateMissionRequestSchema),
  async (c) => {
    const user: AuthenticatedUser | undefined = c.get("user");
    if (!user) throw new AppError(401, "Unauthorized");

    const param: MissionUpdateRequest = c.req.valid("json");
    const supabase: SupabaseClient<Database> = createSupabaseClient(c.env);

    const updatedMission: Tables<"missions"> = await upsertMissionService(
      supabase,
      user.id,
      param.content,
    );
    return c.json(
      UpdateMissionResponseSchema.parse({ mission: updatedMission }),
      200,
    );
  },
);

export default missions;
