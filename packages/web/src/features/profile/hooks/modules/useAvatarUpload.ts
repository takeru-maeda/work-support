import { useCallback, type ChangeEvent } from "react";

import { uploadAvatarImage, deleteAvatarImage } from "@/lib/storage";
import { showErrorToast } from "@/lib/toast";
import { reportUiError } from "@/services/logs";
import type { AuthUser } from "@/lib/auth";
import type { UserProfile } from "@/types/userProfile";

interface UseAvatarUploadOptions {
  user: AuthUser | null;
  currentAvatarUrl?: string | null;
  setSaving: (saving: boolean) => void;
  setProfile: (updater: (prev: UserProfile) => UserProfile) => void;
  persistProfile: (
    updates: { avatarUrl?: string },
    options?: { successMessage?: string; manageSavingState?: boolean },
  ) => Promise<boolean>;
}

/**
 * プロフィール画像のアップロード処理を提供します。
 *
 * @param options フックで利用する依存値
 * @returns input change 用ハンドラ
 */
export const useAvatarUpload = ({
  user,
  currentAvatarUrl,
  setSaving,
  setProfile,
  persistProfile,
}: UseAvatarUploadOptions) => {
  return useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!user) return;

      const inputElement = event.target;
      const file: File | undefined = inputElement.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        showErrorToast("画像ファイルを選択してください");
        inputElement.value = "";
        return;
      }

      const previousAvatar: string | null = currentAvatarUrl ?? null;
      let uploadedObjectPath: string | null = null;
      setSaving(true);

      void (async () => {
        try {
          const { publicUrl, objectPath } = await uploadAvatarImage(
            user.id,
            file,
          );
          uploadedObjectPath = objectPath;
          const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

          setProfile((prev) => ({
            ...prev,
            avatarUrl: cacheBustedUrl,
          }));

          const success: boolean = await persistProfile(
            { avatarUrl: cacheBustedUrl },
            {
              successMessage: "プロフィール画像を更新しました",
              manageSavingState: false,
            },
          );

          const shouldDelete: boolean =
            user.avatarUrl?.includes(uploadedObjectPath) === false;

          if (!success) {
            if (uploadedObjectPath) {
              await handleAvatarImageDelete(uploadedObjectPath);
            }
            setProfile((prev) => ({
              ...prev,
              avatarUrl: previousAvatar ?? prev.avatarUrl,
            }));
          } else if (shouldDelete) {
            const match: RegExpExecArray | null = new RegExp(
              /avatars\/([^?]+)/,
            ).exec(user.avatarUrl!);
            const oldObjectPath: string | null = match ? match[1] : null;
            if (oldObjectPath) {
              await handleAvatarImageDelete(oldObjectPath);
            }
          }
        } catch (error) {
          showErrorToast("プロフィール画像の更新に失敗しました", {
            description: error instanceof Error ? error.message : undefined,
          });
          setProfile((prev) => ({
            ...prev,
            avatarUrl: previousAvatar ?? prev.avatarUrl,
          }));
          void reportUiError(error, {
            message: "Failed update for avatar image.",
          });
          if (uploadedObjectPath) {
            await handleAvatarImageDelete(uploadedObjectPath);
          }
        } finally {
          setSaving(false);
          inputElement.value = "";
        }
      })();
    },
    [currentAvatarUrl, persistProfile, setProfile, setSaving, user],
  );
};

/**
 * 画像の削除と、エラー時のログ作成を実行します。
 *
 * @param objectPath 削除対象のオブジェクトパス
 */
async function handleAvatarImageDelete(objectPath: string): Promise<void> {
  try {
    await deleteAvatarImage(objectPath);
  } catch (deleteError) {
    reportUiError(deleteError, {
      message: "Failed delete for avatar image.",
    });
  }
}
