import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from "react";

import {
  updateProfile,
  type AuthUser,
  type UpdateProfileParams,
} from "@/lib/auth";
import { deleteAvatarImage, uploadAvatarImage } from "@/lib/storage";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { useUserStore } from "@/store/user";
import type { UserProfile } from "@/types/userProfile";

interface UseProfileManagerResult {
  profile: UserProfile;
  isEditing: boolean;
  saving: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleNameChange: (value: string) => void;
  handleSave: () => Promise<void>;
  handleCancel: () => void;
  handleImageUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  handleAvatarClick: () => void;
  beginEditing: () => void;
}

export function useProfileManager(): UseProfileManagerResult {
  const user: AuthUser | null = useUserStore((state) => state.user);
  const setUser = useUserStore.getState().setUser;

  const [profile, setProfile] = useState<UserProfile>({
    name: user?.name ?? "",
    avatarUrl: user?.avatarUrl,
  });
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!user) return;

    setProfile({
      name: user.name,
      avatarUrl: user.avatarUrl,
    });
  }, [user]);

  const persistProfile = useCallback(
    async (
      updates: UpdateProfileParams,
      options?: {
        onSuccess?: (nextUser: AuthUser) => void;
        successMessage?: string;
        manageSavingState?: boolean;
      },
    ): Promise<boolean> => {
      if (!user) return false;

      const shouldManageSavingState: boolean =
        options?.manageSavingState ?? true;

      if (shouldManageSavingState) {
        setSaving(true);
      }

      try {
        const result = await updateProfile(updates);

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
        return false;
      } finally {
        if (shouldManageSavingState) {
          setSaving(false);
        }
      }
    },
    [setUser, user],
  );

  const handleNameChange = useCallback((value: string) => {
    setProfile((prev) => ({
      ...prev,
      name: value,
    }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!user) return;

    await persistProfile(
      { name: profile.name },
      {
        onSuccess: () => setIsEditing(false),
      },
    );
  }, [persistProfile, profile.name, user]);

  const handleCancel = useCallback(() => {
    if (!user) return;

    setProfile({
      name: user.name,
      avatarUrl: user.avatarUrl ?? "",
    });
    setIsEditing(false);
  }, [user]);

  const handleImageUpload = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!user) return;

      const inputElement = event.target;
      const file = inputElement.files?.[0];
      if (!file) return;

      console.log(file);

      if (!file.type.startsWith("image/")) {
        showErrorToast("画像ファイルを選択してください");
        inputElement.value = "";
        return;
      }

      const previousAvatar = profile.avatarUrl;
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

          const success = await persistProfile(
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
                console.error("Failed to rollback avatar upload", deleteError);
              }
            }
            setProfile((prev) => ({
              ...prev,
              avatarUrl: previousAvatar,
            }));
          }
        } catch (error) {
          showErrorToast("プロフィール画像の更新に失敗しました", {
            description: error instanceof Error ? error.message : undefined,
          });
          setProfile((prev) => ({
            ...prev,
            avatarUrl: previousAvatar,
          }));
          if (uploadedObjectPath) {
            try {
              await deleteAvatarImage(uploadedObjectPath);
            } catch (deleteError) {
              console.error("Failed to rollback avatar upload", deleteError);
            }
          }
        } finally {
          setSaving(false);
          inputElement.value = "";
        }
      })();
    },
    [persistProfile, profile.avatarUrl, user],
  );

  const handleAvatarClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const beginEditing = useCallback(() => {
    setIsEditing(true);
  }, []);

  return {
    profile,
    isEditing,
    saving,
    fileInputRef,
    handleNameChange,
    handleSave,
    handleCancel,
    handleImageUpload,
    handleAvatarClick,
    beginEditing,
  };
}
