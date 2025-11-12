import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import type { SupabaseClient } from "@supabase/supabase-js";

import { AuthenticatedUser, HonoEnv } from "../../custom-types";
import { jwtAuthMiddleware } from "../../middleware/auth";
import { createSupabaseClient } from "../../lib/supabase";
import type { Database } from "../../../../shared/src/types/db";
import { AppError } from "../../lib/errors";
import { deleteCurrentUserAccount } from "./service";

const users = new Hono<HonoEnv>();

users.use("*", jwtAuthMiddleware);

users.delete(
  "/me",
  describeRoute({
    description: "認証ユーザー自身のアカウントを削除します",
    responses: {
      204: {
        description: "User deleted successfully",
      },
      401: {
        description: "Unauthorized",
      },
      500: {
        description: "Failed to delete user",
      },
    },
  }),
  async (c) => {
    const user: AuthenticatedUser | undefined = c.get("user");
    if (!user) throw new AppError(401, "Unauthorized");

    const supabase: SupabaseClient<Database> = createSupabaseClient(c.env);
    await deleteCurrentUserAccount(supabase, user.id);

    return c.body(null, 204);
  },
);

export default users;
