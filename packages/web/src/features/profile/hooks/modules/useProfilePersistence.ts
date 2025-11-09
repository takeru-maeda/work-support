import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";

import {
  updateProfile,
  type AuthUser,
  type UpdateProfileParams,
  type UserUpdateResult,
} from "@/lib/auth";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { reportUiError } from "@/services/logs";
import { useUserStore } from "@/store/user";
import type { UserProfile } from "@/types/userProfile";

interface PersistOptions {
  onSuccess?: (nextUser: AuthUser) => void;
  successMessage?: string;
  manageSavingState?: boolean;
}

interface UseProfilePersistenceOptions {
  setSaving: (saving: boolean) => void;
  setProfile: Dispatch<SetStateAction<UserProfile>>;
}

export const useProfilePersistence = ({
  setSaving,
  setProfile,
}: UseProfilePersistenceOptions) => {
  const user: AuthUser | null = useUserStore((state) => state.user);
  const setUser = useUserStore.getState().setUser;

  return useCallback(
    async (
      updates: UpdateProfileParams,
      options?: PersistOptions,
    ): Promise<boolean> => {
      if (!user) return false;

      const shouldManageSavingState: boolean =
        options?.manageSavingState ?? true;
      if (shouldManageSavingState) {
        setSaving(true);
      }

      try {
        const result: UserUpdateResult = await updateProfile(updates);

        if (!result.success) {
          showErrorToast("プロフィールの更新に失敗しました", {
            description: result.error,
          });
          return false;
        }

        const nextUser: AuthUser = result.user ?? {
          ...user,
          name: updates.name ?? user.name,
          avatarUrl: updates.avatarUrl ?? user.avatarUrl,
        };

        setUser(nextUser);
        setProfile((prev) => ({
          name: result.user?.name ?? updates.name ?? prev.name,
          avatarUrl:
            result.user?.avatarUrl ?? updates.avatarUrl ?? prev.avatarUrl,
        }));

        showSuccessToast(
          options?.successMessage ?? "プロフィールを更新しました",
        );
        options?.onSuccess?.(nextUser);
        return true;
      } catch (error) {
        showErrorToast("プロフィールの更新に失敗しました", {
          description: error instanceof Error ? error.message : undefined,
        });
        reportUiError(error);
        return false;
      } finally {
        if (shouldManageSavingState) {
          setSaving(false);
        }
      }
    },
    [setProfile, setSaving, setUser, user],
  );
};
