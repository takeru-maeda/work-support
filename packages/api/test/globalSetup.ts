import { execFileSync } from "node:child_process";
import path from "node:path";

import type { TestProject } from "vitest/node";

/** 結合テストに渡す、ローカルの Supabase の接続情報（公開の固定値。秘密情報ではない） */
export interface LocalSupabase {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  jwtSecret: string;
}

declare module "vitest" {
  export interface ProvidedContext {
    supabase: LocalSupabase;
  }
}

/**
 * 結合テストの前に、ローカルの Supabase（`pnpm db:start`）の接続情報を読み、各テストへ渡します。
 * `.dev.vars`（本番や開発用の接続情報）は読みません。
 */
export default function setup(project: TestProject): void {
  const apiDir = path.resolve(import.meta.dirname, "..");
  const bin = path.resolve(apiDir, "../../node_modules/.bin/supabase");
  let status: Record<string, string>;
  try {
    const out = execFileSync(
      bin,
      ["status", "--workdir", apiDir, "-o", "json"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    status = JSON.parse(out) as Record<string, string>;
  } catch {
    throw new Error(
      "ローカルの Supabase が起動していません。リポジトリのルートで `pnpm db:start` を実行してから、もう一度テストを回してください",
    );
  }
  project.provide("supabase", {
    url: status.API_URL,
    anonKey: status.ANON_KEY,
    serviceRoleKey: status.SERVICE_ROLE_KEY,
    jwtSecret: status.JWT_SECRET,
  });
}
