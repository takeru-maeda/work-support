import { Hono } from "hono";
import { SupabaseClient } from "@supabase/supabase-js";
import { describeRoute, resolver } from "hono-openapi";

import { AuthenticatedUser, HonoEnv } from "../../custom-types";
import { jwtAuthMiddleware } from "../../middleware/auth";
import { createSupabaseClient } from "../../lib/supabase";
import { getProjectsWithTasks } from "./service";
import { ProjectsResponse, ProjectsResponseSchema } from "./types";
import { AppError } from "../../lib/errors";
import type { Database } from "../../../../shared/src/types/db";

const projects = new Hono<HonoEnv>();

projects.use("*", jwtAuthMiddleware);

projects.get(
  "/",
  describeRoute({
    description: "ユーザーに紐づく案件とタスクを取得します",
    responses: {
      200: {
        description: "Projects fetch successfully",
        content: {
          "application/json": {
            schema: resolver(ProjectsResponseSchema),
          },
        },
      },
    },
  }),
  async (c) => {
    const user: AuthenticatedUser | undefined = c.get("user");
    if (!user) throw new AppError(401, "Unauthorized");

    const supabase: SupabaseClient<Database> = createSupabaseClient(c.env);

    const projectsWithTasks = await getProjectsWithTasks(supabase, user.id);

    const response: ProjectsResponse = {
      projects: projectsWithTasks,
    };

    return c.json(ProjectsResponseSchema.parse(response), 200);
  },
);

export default projects;
