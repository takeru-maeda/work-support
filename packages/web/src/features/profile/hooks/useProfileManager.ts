import { useCallback, type ChangeEvent, type RefObject } from "react";

import type { UserProfile } from "@/types/userProfile";
import { useProfileState } from "@/features/profile/hooks/modules/useProfileState";
import { useProfilePersistence } from "@/features/profile/hooks/modules/useProfilePersistence";
import { useAvatarUpload } from "@/features/profile/hooks/modules/useAvatarUpload";

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
  const {
    user,
    profile,
    setProfile,
    isEditing,
    setIsEditing,
    saving,
    setSaving,
    fileInputRef,
    resetProfileFromUser,
  } = useProfileState();

  const persistProfile = useProfilePersistence({
    setSaving,
    setProfile,
  });

  const handleNameChange = useCallback(
    (value: string) => {
      setProfile((prev) => ({
        ...prev,
        name: value,
      }));
    },
    [setProfile],
  );

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
    resetProfileFromUser();
    setIsEditing(false);
  }, [resetProfileFromUser]);

  const handleImageUpload = useAvatarUpload({
    user,
    currentAvatarUrl: profile.avatarUrl,
    setSaving,
    setProfile,
    persistProfile,
  });

  const handleAvatarClick = useCallback(() => {
    fileInputRef.current?.click();
  }, [fileInputRef]);

  const beginEditing = useCallback(() => {
    setIsEditing(true);
  }, [setIsEditing]);

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
