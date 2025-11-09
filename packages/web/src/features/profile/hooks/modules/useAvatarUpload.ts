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

          if (!success) {
            if (uploadedObjectPath) {
              try {
                await deleteAvatarImage(uploadedObjectPath);
              } catch (deleteError) {
                reportUiError(deleteError);
              }
            }
            setProfile((prev) => ({
              ...prev,
              avatarUrl: previousAvatar ?? prev.avatarUrl,
            }));
          }
        } catch (error) {
          showErrorToast("プロフィール画像の更新に失敗しました", {
            description: error instanceof Error ? error.message : undefined,
          });
          setProfile((prev) => ({
            ...prev,
            avatarUrl: previousAvatar ?? prev.avatarUrl,
          }));
          void reportUiError(error);

          if (uploadedObjectPath) {
            try {
              await deleteAvatarImage(uploadedObjectPath);
            } catch (deleteError) {
              reportUiError(deleteError);
            }
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
