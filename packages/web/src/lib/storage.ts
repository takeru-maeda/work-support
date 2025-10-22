import { supabase } from "@/lib/supabase";

const AVATAR_BUCKET = "avatars";

interface UploadAvatarResult {
  publicUrl: string;
  objectPath: string;
}

/**
 * Supabase Storage にプロフィール画像をアップロードします。
 *
 * @param userId ユーザー ID
 * @param file アップロードする画像ファイル
 * @returns 公開 URL とオブジェクトパス
 */
export async function uploadAvatarImage(
  userId: string,
  file: File,
): Promise<UploadAvatarResult> {
  const extension: string = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const objectPath: string = `${userId}/avatar.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(objectPath, file, { upsert: true });

  if (uploadError) throw new Error(uploadError.message);

  const { data: publicData } = supabase.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(objectPath);

  const publicUrl: string | undefined = publicData?.publicUrl;
  if (!publicUrl) {
    throw new Error("アップロードした画像のURL取得に失敗しました");
  }

  return { publicUrl, objectPath };
}

/**
 * Supabase Storage からプロフィール画像を削除します。
 *
 * @param objectPath 削除対象のオブジェクトパス
 */
export async function deleteAvatarImage(objectPath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .remove([objectPath]);

  if (error) throw new Error(error.message);
}
