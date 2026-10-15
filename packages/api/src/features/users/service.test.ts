import { describe, expect, it, vi } from "vitest";

import { AppError } from "../../lib/errors";

import { deleteCurrentUserAccount } from "./service";

import type { Database } from "../../../../shared/src/types/db";
import type { SupabaseClient } from "@supabase/supabase-js";

// アカウントの削除の各段の失敗（docs/specs/profile/spec.md の AC-14）。DB を使わずに、Supabase のクライアントを差し替える
const USER_ID = "00000000-0000-4000-8000-000000000001";
const AVATAR_URL = `http://supabase.test/storage/v1/object/public/avatars/${USER_ID}/avatar.png?t=1`;

const failure = { message: "失敗", status: 500 };

interface FakeOptions {
  avatarUrl?: string;
  failAt?: "getUser" | "list" | "deleteUser" | "remove";
}

/** 呼ばれた順番を記録する、管理用クライアントの偽物 */
function fakeClient({ avatarUrl, failAt }: FakeOptions = {}) {
  const calls: string[] = [];
  const client = {
    auth: {
      admin: {
        getUserById: vi.fn(async () => {
          calls.push("getUser");
          return failAt === "getUser"
            ? { data: { user: null }, error: failure }
            : {
                data: { user: { user_metadata: { avatarUrl } } },
                error: null,
              };
        }),
        deleteUser: vi.fn(async () => {
          calls.push("deleteUser");
          return { data: {}, error: failAt === "deleteUser" ? failure : null };
        }),
      },
    },
    storage: {
      from: () => ({
        list: vi.fn(async () => {
          calls.push("list");
          return failAt === "list"
            ? { data: null, error: failure }
            : { data: [{ name: "avatar.png" }], error: null };
        }),
        remove: vi.fn(async (paths: string[]) => {
          calls.push(`remove:${paths.join(",")}`);
          return { data: [], error: failAt === "remove" ? failure : null };
        }),
      }),
    },
  };
  return { client: client as unknown as SupabaseClient<Database>, calls };
}

async function errorOf(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof AppError) return error;
    throw error;
  }
  throw new Error("失敗しなかった");
}

describe("deleteCurrentUserAccount", () => {
  it("AC-profile-14: ユーザーを読み、画像の一覧を取り、ユーザーを消してから画像を消す", async () => {
    const { client, calls } = fakeClient({ avatarUrl: AVATAR_URL });

    await deleteCurrentUserAccount(client, USER_ID);

    expect(calls).toEqual([
      "getUser",
      "list",
      "deleteUser",
      `remove:${USER_ID}/avatar.png`,
    ]);
  });

  it.each([
    ["画像が無い", undefined],
    [
      "他人のフォルダの URL",
      `http://supabase.test/storage/v1/object/public/avatars/other/avatar.png`,
    ],
    ["avatars でない URL", "https://example.com/me.png"],
  ])(
    "AC-profile-14: %sなら、画像の一覧も削除もしない",
    async (_label, avatarUrl) => {
      const { client, calls } = fakeClient({ avatarUrl });

      await deleteCurrentUserAccount(client, USER_ID);

      expect(calls).toEqual(["getUser", "deleteUser"]);
    },
  );

  it.each([
    ["getUser", "Failed to fetch user before deletion", ["getUser"]],
    ["list", "Failed to list avatar files", ["getUser", "list"]],
    ["deleteUser", "Failed to delete user", ["getUser", "list", "deleteUser"]],
    // ユーザーを消したあとの失敗（既知の落とし穴。利用者はログインのまま残る）
    [
      "remove",
      "Failed to delete avatar asset",
      ["getUser", "list", "deleteUser", `remove:${USER_ID}/avatar.png`],
    ],
  ] as const)(
    "AC-profile-14: %s で失敗すると 500「%s」で、そこで止まる",
    async (failAt, message, expectedCalls) => {
      const { client, calls } = fakeClient({ avatarUrl: AVATAR_URL, failAt });

      const error = await errorOf(deleteCurrentUserAccount(client, USER_ID));

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe(message);
      expect(calls).toEqual(expectedCalls);
    },
  );
});
