import { createMiddleware } from "hono/factory";
import { createSupabaseClient } from "../lib/supabase";
import { EffortRequest, EffortRequestSchema } from "../features/effort/types";
import z from "zod";
import { AuthError, SupabaseClient, User } from "@supabase/supabase-js";
import { HonoEnv } from "../custom-types";
import { AppError } from "../lib/errors";
import { Database } from "../../../shared/src/types/db";

export const jwtAuthMiddleware = createMiddleware(async (c, next) => {
  const authHeader: string | undefined = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ") !== true) {
    throw new AppError(401, "Unauthorized");
  }

  const token: string = authHeader.split(" ")[1];
  const supabase: SupabaseClient = createSupabaseClient(c.env);
  const { data, error } = await supabase.auth.getUser(token);

  if (error) throw new AppError(401, "Unauthorized", error);

  c.set("user", data.user);
  await next();
});

export const apiKeyAuthMiddleware = createMiddleware(async (c, next) => {
  const authHeader: string | undefined = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ") !== true) {
    throw new AppError(401, "Unauthorized");
  }

  const apiKey: string = authHeader.split(" ")[1];
  if (apiKey !== c.env.API_KEY) throw new AppError(401, "Unauthorized");

  const body = await c.req.json();
  const result: z.ZodSafeParseResult<EffortRequest> =
    EffortRequestSchema.safeParse(body);

  if (!result.success) {
    const messages = result.error.issues.map((issue) => {
      const path = issue.path?.length ? `${issue.path.join(".")}: ` : "";
      return `${path}${issue.message}`;
    });
    const errorMessage = messages.join(" | ");
    throw new AppError(400, errorMessage);
  }

  const parsed: EffortRequest = result.data;
  const email: string = parsed.email;

  if (!email) throw new AppError(400, "Email is required");

  const { user, error } = await findUserByEmail(email, c.env);
  if (error || !user) throw new AppError(400, "User not found", error);

  c.set("user", user);
  await next();
});

const findUserByEmail = async (
  email: string,
  env: HonoEnv["Bindings"],
): Promise<{ user?: User; error?: AuthError }> => {
  const lowerEmail: string = email.toLowerCase();
  const supabase: SupabaseClient<Database> = createSupabaseClient(env);

  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) return { error };

    const found: User | undefined = data.users.find(
      (u) => u.email?.toLowerCase() === lowerEmail,
    );
    if (found) return { user: found };
    if (data.users.length < perPage) break;
    page += 1;
  }
  return {};
};
