/**
 * ローカルの Supabase だけにつながる API と web を起動し、確認用のアカウントを用意します（`pnpm dev:local`）。
 * Playwright MCP で画面を確かめるときに使う。開発用のクラウドの DB には書き込まない。
 */
import { spawn } from "node:child_process";

import { API_URL, WEB_URL, localServers, localSupabase } from "./localStack.ts";

import type { ServerSpec } from "./localStack.ts";
import type { ChildProcess } from "node:child_process";

/** 確認用のアカウント。ローカルの Supabase にだけある */
export const LOCAL_ACCOUNT = {
  email: "local@example.test",
  password: "local-password",
  name: "ローカル 確認",
} as const;

const sb = localSupabase();

const res = await fetch(`${sb.url}/auth/v1/admin/users`, {
  method: "POST",
  headers: {
    apikey: sb.serviceRoleKey,
    Authorization: `Bearer ${sb.serviceRoleKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: LOCAL_ACCOUNT.email,
    password: LOCAL_ACCOUNT.password,
    email_confirm: true,
    user_metadata: { name: LOCAL_ACCOUNT.name },
  }),
});
// 2 回目以降は「すでにある」（422）になる。データはローカルの DB に残る（pnpm db:stop / db:start でも残る）
if (!res.ok && res.status !== 422) {
  throw new Error(`確認用のアカウントを作れませんでした: ${await res.text()}`);
}

const start = (name: string, spec: ServerSpec): ChildProcess =>
  spawn(spec.command, spec.args, {
    cwd: spec.cwd,
    env: { ...process.env, ...spec.env },
    stdio: ["ignore", "inherit", "inherit"],
  }).on("exit", (code) => {
    console.error(`${name} が終了しました（code ${code}）`);
    process.exit(code ?? 1);
  });

const servers = localServers(sb);
const children: ChildProcess[] = [
  start("API", servers.api),
  start("web", servers.web),
];
const stop = () => {
  for (const child of children) child.kill();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

console.log(`
ローカルの確認用の環境を起動しています（止めるときは Ctrl+C）
  web: ${WEB_URL}/login
  API: ${API_URL}（接続先: ${sb.url}）
  アカウント: ${LOCAL_ACCOUNT.email} / ${LOCAL_ACCOUNT.password}
`);
