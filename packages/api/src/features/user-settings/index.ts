import { Hono } from "hono";
import { SupabaseClient } from "@supabase/supabase-js";
import { describeRoute, resolver, validator } from "hono-openapi";

import { AuthenticatedUser, HonoEnv } from "../../custom-types";
import { jwtAuthMiddleware } from "../../middleware/auth";
import { createSupabaseClient } from "../../lib/supabase";
import {
  UpdateUserSettingsRequest,
  UpdateUserSettingsRequestSchema,
  UserSettings,
  UserSettingsResponse,
  UserSettingsResponseSchema,
} from "./types";
import {
  createUserSettingsService,
  fetchUserSettings,
  updateUserSettingsService,
} from "./service";
import { AppError } from "../../lib/errors";
import type { Database, Tables } from "../../../../shared/src/types/db";

const userSettings = new Hono<HonoEnv>();

userSettings.use("*", jwtAuthMiddleware);

userSettings.post(
  "/",
  describeRoute({
    description: "ユーザー設定を初期化します",
    responses: {
      201: {
        description: "User settings created successfully",
        content: {
          "application/json": {
            schema: resolver(UserSettingsResponseSchema),
          },
        },
      },
      200: {
        description: "User settings already exist",
        content: {
          "application/json": {
            schema: resolver(UserSettingsResponseSchema),
          },
        },
      },
    },
  }),
  async (c) => {
    const user: AuthenticatedUser | undefined = c.get("user");
    if (!user) throw new AppError(401, "Unauthorized");

    const supabase: SupabaseClient<Database> = createSupabaseClient(c.env);
    const existing: Tables<"user_settings"> | null = await fetchUserSettings(
      supabase,
      user.id,
    );
    if (existing) {
      const response: UserSettingsResponse = {
        user_settings: existing,
      };
      return c.json(UserSettingsResponseSchema.parse(response), 200);
    }

    const created: Tables<"user_settings"> = await createUserSettingsService(
      supabase,
      user.id,
      true,
    );
    const response: UserSettingsResponse = {
      user_settings: created,
    };
    return c.json(UserSettingsResponseSchema.parse(response), 201);
  },
);

userSettings.get(
  "/",
  describeRoute({
    description: "ユーザー設定を取得します",
    responses: {
      200: {
        description: "User settings fetch successfully",
        content: {
          "application/json": {
            schema: resolver(UserSettingsResponseSchema),
          },
        },
      },
      404: {
        description: "User settings not found",
      },
    },
  }),
  async (c) => {
    const user: AuthenticatedUser | undefined = c.get("user");
    if (!user) throw new AppError(401, "Unauthorized");

    const supabase: SupabaseClient<Database> = createSupabaseClient(c.env);

    const settings: UserSettings | null = await fetchUserSettings(
      supabase,
      user.id,
    );

    if (!settings) {
      throw new AppError(404, "User settings not found");
    }

    const response: UserSettingsResponse = {
      user_settings: settings,
    };

    return c.json(UserSettingsResponseSchema.parse(response), 200);
  },
);

userSettings.put(
  "/",
  describeRoute({
    description: "ユーザー設定を更新します",
    responses: {
      200: {
        description: "User settings updated successfully",
        content: {
          "application/json": {
            schema: resolver(UserSettingsResponseSchema),
          },
        },
      },
      404: {
        description: "User settings not found",
      },
    },
  }),
  validator("json", UpdateUserSettingsRequestSchema),
  async (c) => {
    const user: AuthenticatedUser | undefined = c.get("user");
    if (!user) throw new AppError(401, "Unauthorized");

    const body: UpdateUserSettingsRequest = c.req.valid("json");
    const supabase: SupabaseClient<Database> = createSupabaseClient(c.env);

    const updatedSettings = await updateUserSettingsService(
      supabase,
      user.id,
      body.notifyEffortEmail,
    );

    const response: UserSettingsResponse = {
      user_settings: updatedSettings,
    };

    return c.json(UserSettingsResponseSchema.parse(response), 200);
  },
);

export default userSettings;
