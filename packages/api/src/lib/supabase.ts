import { createClient } from "@supabase/supabase-js";

import type { Database } from "../../../shared/src/types/db";
import type { HonoEnv } from "../customTypes";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient<Database> | null = null;

/**
 * Supabaseクライアントを生成します。
 *
 * @param env 環境変数バインディング
 * @returns Supabaseクライアント
 */
export const createSupabaseClient = (
  env: HonoEnv["Bindings"],
): SupabaseClient<Database> => {
  if (client) return client;
  client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  return client;
};
