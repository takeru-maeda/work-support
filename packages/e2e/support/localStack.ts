import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT: string = path.resolve(import.meta.dirname, "../../..");
const API_DIR: string = path.join(ROOT, "packages/api");

/** E2E で使うポート。開発サーバー（5173 / 8787）と同時に動かせるよう、別にしている */
export const WEB_PORT = 5183;
export const API_PORT = 8797;
export const WEB_URL = `http://localhost:${WEB_PORT}`;
export const API_URL = `http://localhost:${API_PORT}`;

/** GAS 用の API キー。E2E の中だけで使う値 */
export const E2E_API_KEY = "e2e-api-key";

/** ローカルの Supabase の接続情報（`supabase status` が返す公開の固定値。秘密情報ではない） */
export interface LocalSupabase {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  jwtSecret: string;
}

const ENV_KEY = "E2E_LOCAL_SUPABASE";

/**
 * ローカルの Supabase（`pnpm db:start`）の接続情報を読みます。
 * 設定ファイルは Playwright の各ワーカーでも読み込まれるので、最初に読んだ値を環境変数で引き継ぐ。
 *
 * @returns 接続情報
 */
export function localSupabase(): LocalSupabase {
  const cached: string | undefined = process.env[ENV_KEY];
  if (cached) return JSON.parse(cached) as LocalSupabase;

  let status: Record<string, string>;
  try {
    const out: string = execFileSync(
      path.join(ROOT, "node_modules/.bin/supabase"),
      ["status", "--workdir", API_DIR, "-o", "json"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    status = JSON.parse(out) as Record<string, string>;
  } catch {
    throw new Error(
      "ローカルの Supabase が起動していません。リポジトリのルートで `pnpm db:start` を実行してから、もう一度 E2E を回してください",
    );
  }
  const sb: LocalSupabase = {
    url: status.API_URL,
    anonKey: status.ANON_KEY,
    serviceRoleKey: status.SERVICE_ROLE_KEY,
    jwtSecret: status.JWT_SECRET,
  };
  process.env[ENV_KEY] = JSON.stringify(sb);
  return sb;
}

/**
 * E2E 用の API（wrangler dev）の設定ファイルを作り、そのフォルダを返します。
 *
 * wrangler は、起動したフォルダの `.dev.vars` を読み、`--env-file` より優先する。packages/api で起動すると
 * 開発用のクラウドの DB につながるので、git の対象外のフォルダに設定を作り、そこで起動する。
 * 接続先は設定の `vars` に書くので、起動時の表示にそのまま出る。
 *
 * @param sb ローカルの Supabase の接続情報
 * @returns wrangler を起動するフォルダ
 */
export function writeApiConfig(sb: LocalSupabase): string {
  const dir: string = path.join(API_DIR, "node_modules/.cache/e2e-api");
  mkdirSync(dir, { recursive: true });
  const config = {
    name: "work-support-e2e",
    main: path.relative(dir, path.join(API_DIR, "src/index.ts")),
    compatibility_date: "2025-09-28",
    vars: {
      SUPABASE_URL: sb.url,
      SUPABASE_SERVICE_ROLE_KEY: sb.serviceRoleKey,
      SUPABASE_JWT_SECRET: sb.jwtSecret,
      API_KEY: E2E_API_KEY,
      APP_EMAIL: "app@example.test",
      DEVELOPER_EMAIL: "developer@example.test",
      DEV_FRONTEND_URL: WEB_URL,
      // メールは送らない（宛先を、つながらないアドレスにしておく）。工数を登録すると完了メールの送信に失敗し、
      // wrangler のログに「Failed to call mail API」が出るが、想定どおり
      GAS_EMAIL_ENDPOINT: "http://127.0.0.1:9/gas",
    },
  };
  writeFileSync(
    path.join(dir, "wrangler.json"),
    `${JSON.stringify(config, null, 2)}\n`,
  );
  return dir;
}

/** 起動するサーバーのコマンド */
export interface ServerSpec {
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
}

/**
 * ローカルの Supabase だけにつながる API と web の起動のしかたを返します（E2E と `pnpm dev:local` で共通）。
 *
 * @param sb ローカルの Supabase の接続情報
 * @returns API（wrangler dev）と web（Vite）のコマンド
 */
export function localServers(sb: LocalSupabase): {
  api: ServerSpec;
  web: ServerSpec;
} {
  return {
    api: {
      // packages/api では起動しない（その場の .dev.vars を読むため。writeApiConfig を参照）
      command: path.join(API_DIR, "node_modules/.bin/wrangler"),
      args: ["dev", "--config", "wrangler.json", "--port", String(API_PORT)],
      cwd: writeApiConfig(sb),
      env: {},
    },
    web: {
      command: "pnpm",
      args: [
        "--filter",
        "web",
        "exec",
        "vite",
        "--port",
        String(WEB_PORT),
        "--strictPort",
      ],
      cwd: ROOT,
      // Vite は、すでにある環境変数を .env で上書きしない
      env: {
        VITE_SUPABASE_URL: sb.url,
        VITE_SUPABASE_ANON_KEY: sb.anonKey,
        VITE_API_BASE_URL: API_URL,
      },
    },
  };
}
