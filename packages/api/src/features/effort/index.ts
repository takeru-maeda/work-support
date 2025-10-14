import { Hono } from "hono";

import { apiKeyAuthMiddleware } from "../../middleware/auth";
import {
  EffortRequestSchema,
  EffortResponse,
  EffortResponseSchema,
} from "./types";
import { HonoEnv } from "../../custom-types";
import { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseClient } from "../../lib/supabase";
import { AppError } from "../../lib/errors";
import { Database } from "../../../../shared/src/schemas/db";
import { saveEffortRecords } from "./service";
import { describeRoute, resolver, validator } from "hono-openapi";

const effort = new Hono<HonoEnv>();

effort.use("*", apiKeyAuthMiddleware);

effort.post(
  "/",
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
    const user: User | undefined = c.get("user");
    if (!user) throw new AppError(401, "Unauthorized");

    const userId = user.id;

    const supabase: SupabaseClient<Database> = createSupabaseClient(c.env);
    await saveEffortRecords(supabase, userId, new Date(date), effort);

    const response: EffortResponse = {
      message: "Effort data processed and saved successfully",
    };

    return c.json(response, 201);
  },
);

export default effort;
