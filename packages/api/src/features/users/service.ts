import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../../shared/src/types/db";
import { AppError } from "../../lib/errors";

const AVATAR_BUCKET = "avatars";
const STORAGE_LIST_LIMIT = 100;

/**
 * 認証ユーザーのアカウントおよび関連アバターファイルを削除します。
 *
 * @param supabase Supabase管理クライアント
 * @param userId 認証ユーザーのID
 */
export const deleteCurrentUserAccount = async (
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> => {
  const { data: fetchedUser, error: fetchError } =
    await supabase.auth.admin.getUserById(userId);

  if (fetchError) {
    throw new AppError(500, "Failed to fetch user before deletion", fetchError);
  }

  const avatarUrl: unknown = fetchedUser?.user?.user_metadata?.avatarUrl;
  const avatarFolder: string | null = extractAvatarFolder(avatarUrl, userId);
  const avatarFiles: string[] =
    avatarFolder !== null ? await listAvatarFiles(supabase, userId) : [];

  const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
  if (deleteError) {
    throw new AppError(500, "Failed to delete user", deleteError);
  }

  if (avatarFiles.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .remove(avatarFiles);
    if (storageError) {
      throw new AppError(500, "Failed to delete avatar asset", storageError);
    }
  }
};

/**
 * avatarUrl から avatars/{userId}/ のフォルダプレフィックスを推測します。
 *
 * @param avatarUrl ユーザーメタデータ内に保持されているアバターURL
 * @param userId ユーザーID
 * @returns フォルダパス（例: `${userId}/`）。解釈できない場合は null。
 */
function extractAvatarFolder(
  avatarUrl: unknown,
  userId: string,
): string | null {
  if (typeof avatarUrl !== "string" || avatarUrl.length === 0) {
    return null;
  }

  try {
    const parsedUrl: URL = new URL(avatarUrl);
    const segments: string[] = parsedUrl.pathname.split("/").filter(Boolean);
    const bucketIndex: number = segments.indexOf(AVATAR_BUCKET);
    if (bucketIndex === -1) return null;

    const pathSegments: string[] = segments.slice(bucketIndex + 1);
    if (pathSegments.length === 0) return null;

    const path: string = pathSegments.join("/");
    if (!path.startsWith(`${userId}/`)) return null;

    return `${userId}/`;
  } catch {
    return null;
  }
}

/**
 * ユーザーのアバターフォルダ内のファイルを全て列挙します。
 *
 * @param supabase Supabase管理クライアント
 * @param userId ユーザーID
 * @returns avatars/{userId}/ 配下のファイルパス一覧
 */
async function listAvatarFiles(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string[]> {
  const files: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .list(userId, { limit: STORAGE_LIST_LIMIT, offset });

    if (error) {
      throw new AppError(500, "Failed to list avatar files", error);
    }

    if (!data || data.length === 0) break;

    for (const entry of data) {
      if (entry.name) {
        files.push(`${userId}/${entry.name}`);
      }
    }

    if (data.length < STORAGE_LIST_LIMIT) break;
    offset += data.length;
  }

  return files;
}
