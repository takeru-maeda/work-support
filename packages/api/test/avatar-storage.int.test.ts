import { describe, expect, it, onTestFinished } from "vitest";

import { adminClient, browserClient, callApi, createTestUser } from "./helpers";
import { getOAuthAccessToken } from "./oauthHelpers";

import type { TestUser } from "./helpers";

// プロフィール画像の保存先（avatars バケット）は、web がブラウザから本人のトークンで直接読み書きする。
// 守りは storage.objects のポリシーだけなので、ブラウザと同じ権限のクライアントで確かめる（INV-1）
const BUCKET = "avatars";

const image = (content: string): Blob =>
  new Blob([content], { type: "image/png" });

/**
 * service role で、その場所のファイルの中身を読む。無ければ null。
 * download の「見つからない」は中身の無いエラーで、ほかの失敗と区別できないので、先に一覧で有無を確かめる
 */
const readAs = async (path: string): Promise<string | null> => {
  const storage = adminClient().storage.from(BUCKET);
  const slash = path.lastIndexOf("/");
  const [folder, name] =
    slash === -1 ? ["", path] : [path.slice(0, slash), path.slice(slash + 1)];
  const listed = await storage.list(folder, { search: name });
  if (listed.error) throw listed.error;
  if (!listed.data.some((file) => file.name === name)) return null;

  const { data, error } = await storage.download(path);
  if (error) throw error;
  return await data.text();
};

/** テストで置いたファイルを、終わったら service role で消す（ユーザーを消してもファイルは残るため） */
const cleanUp = (...paths: string[]): void => {
  onTestFinished(async () => {
    const { error } = await adminClient().storage.from(BUCKET).remove(paths);
    if (error) throw error;
  });
};

/** 相手（victim）のフォルダに、service role で画像を置く */
const placeAvatar = async (
  owner: TestUser,
  content = "victim",
): Promise<string> => {
  const path = `${owner.id}/avatar.png`;
  cleanUp(path);
  const { error } = await adminClient()
    .storage.from(BUCKET)
    .upload(path, image(content), { upsert: true });
  if (error) throw new Error(`画像を置けませんでした: ${error.message}`);
  return path;
};

describe("プロフィール画像の保存先の権限（avatars）", () => {
  it("AC-profile-01: 自分のフォルダにアップロードでき、同じ名前で上書きもできる", async () => {
    const me = await createTestUser();
    const path = `${me.id}/avatar.png`;
    cleanUp(path);
    const storage = browserClient(me).storage.from(BUCKET);

    const first = await storage.upload(path, image("v1"), { upsert: true });
    expect(first.error).toBeNull();
    const second = await storage.upload(path, image("v2"), { upsert: true });
    expect(second.error).toBeNull();
    expect(await readAs(path)).toBe("v2");
  });

  it("AC-profile-02: 他人のフォルダ、バケットの直下、ログインしていない状態ではアップロードできない", async () => {
    const me = await createTestUser();
    const other = await createTestUser();
    const targets = [
      `${other.id}/avatar.png`,
      "avatar.png",
      `${me.id}/anon.png`,
    ];
    cleanUp(...targets);

    const intoOther = await browserClient(me)
      .storage.from(BUCKET)
      .upload(targets[0], image("x"));
    const intoRoot = await browserClient(me)
      .storage.from(BUCKET)
      .upload(targets[1], image("x"));
    const anonymous = await browserClient()
      .storage.from(BUCKET)
      .upload(targets[2], image("x"));

    expect(intoOther.error).not.toBeNull();
    expect(intoRoot.error).not.toBeNull();
    expect(anonymous.error).not.toBeNull();
    for (const path of targets) expect(await readAs(path)).toBeNull();
  });

  it("AC-profile-03: 他人の画像は、上書き・削除・自分のフォルダへの移動や複製ができず、元のまま残る", async () => {
    const me = await createTestUser();
    const victim = await createTestUser();
    const victimPath = await placeAvatar(victim);
    const myPath = `${me.id}/stolen.png`;
    cleanUp(myPath);
    const storage = browserClient(me).storage.from(BUCKET);

    const overwrite = await storage.upload(victimPath, image("evil"), {
      upsert: true,
    });
    expect(overwrite.error).not.toBeNull();
    // 削除は、権限が無いとエラーにならず空振りになる（消えた件数が 0）
    const removed = await storage.remove([victimPath]);
    expect(removed.error).toBeNull();
    expect(removed.data).toEqual([]);
    const moved = await storage.move(victimPath, myPath);
    expect(moved.error).not.toBeNull();
    const copied = await storage.copy(victimPath, myPath);
    expect(copied.error).not.toBeNull();

    expect(await readAs(victimPath)).toBe("victim");
    expect(await readAs(myPath)).toBeNull();
  });

  it("AC-profile-04: 自分の画像は削除できる", async () => {
    const me = await createTestUser();
    const path = await placeAvatar(me, "mine");

    const removed = await browserClient(me).storage.from(BUCKET).remove([path]);
    expect(removed.error).toBeNull();
    expect(removed.data).toHaveLength(1);
    expect(await readAs(path)).toBeNull();
  });

  it("AC-profile-05: 他人のフォルダの一覧は、ログインした他人からもログインしていない状態からも空", async () => {
    const me = await createTestUser();
    const victim = await createTestUser();
    await placeAvatar(victim);

    const byOther = await browserClient(me)
      .storage.from(BUCKET)
      .list(victim.id);
    const anonymous = await browserClient()
      .storage.from(BUCKET)
      .list(victim.id);
    // エラーではなく、ポリシーで絞られた結果として空であることを確かめる
    expect(byOther.error).toBeNull();
    expect(byOther.data).toEqual([]);
    expect(anonymous.error).toBeNull();
    expect(anonymous.data).toEqual([]);

    // 本人には見える
    const byOwner = await browserClient(victim)
      .storage.from(BUCKET)
      .list(victim.id);
    expect(byOwner.data?.map((f) => f.name)).toEqual(["avatar.png"]);
  });

  it("AC-profile-06: 公開 URL なら、ログインしていなくても画像を取得できる", async () => {
    const owner = await createTestUser();
    const path = await placeAvatar(owner, "public");
    const { data } = browserClient().storage.from(BUCKET).getPublicUrl(path);

    const res = await fetch(data.publicUrl);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("public");
  });

  it("AC-profile-07: 画像を設定したユーザーがアカウントを削除すると、フォルダの画像も消える", async () => {
    const me = await createTestUser();
    const path = await placeAvatar(me, "mine");
    const { data } = browserClient().storage.from(BUCKET).getPublicUrl(path);
    // web の updateProfile と同じく、公開 URL を user_metadata.avatarUrl に入れる
    const updated = await adminClient().auth.admin.updateUserById(me.id, {
      user_metadata: { avatarUrl: `${data.publicUrl}?t=1` },
    });
    expect(updated.error).toBeNull();

    const res = await callApi("/api/users/me", { method: "DELETE", user: me });
    expect(res.status, await res.clone().text()).toBe(204);
    expect(await readAs(path)).toBeNull();
  });

  it("AC-profile-08: 自分の画像を、他人のフォルダやバケットの直下へ移動・複製できない", async () => {
    const me = await createTestUser();
    const other = await createTestUser();
    const myPath = await placeAvatar(me, "mine");
    const targets = [`${other.id}/planted.png`, "planted.png"];
    cleanUp(...targets);
    const storage = browserClient(me).storage.from(BUCKET);

    for (const target of targets) {
      const copied = await storage.copy(myPath, target);
      expect(copied.error, `copy → ${target}`).not.toBeNull();
      const moved = await storage.move(myPath, target);
      expect(moved.error, `move → ${target}`).not.toBeNull();
      expect(await readAs(target)).toBeNull();
    }
    expect(await readAs(myPath)).toBe("mine");
  });
});

describe("MCP の OAuth のトークン（INV-mcp-2、docs/specs/mcp/spec.md）", () => {
  it("OAuth のクライアントのトークンでは、自分のフォルダでも読み書き・削除ができない", async () => {
    const me = await createTestUser();
    const { accessToken } = await getOAuthAccessToken(me);
    const asOAuthClient = { ...me, accessToken };
    const existing = await placeAvatar(me, "web で置いた画像");
    const newPath = `${me.id}/oauth.png`;
    cleanUp(newPath);
    const storage = browserClient(asOAuthClient).storage.from(BUCKET);

    const upload = await storage.upload(newPath, image("x"));
    expect(upload.error).not.toBeNull();
    const overwrite = await storage.upload(existing, image("上書き"), {
      upsert: true,
    });
    expect(overwrite.error).not.toBeNull();
    await storage.remove([existing]);
    const listed = await storage.list(me.id);
    expect(listed.data ?? []).toEqual([]);

    expect(await readAs(newPath)).toBeNull();
    expect(await readAs(existing)).toBe("web で置いた画像");
  });
});
