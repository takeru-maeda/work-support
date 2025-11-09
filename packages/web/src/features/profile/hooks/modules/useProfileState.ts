import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

import { useUserStore } from "@/store/user";
import type { UserProfile } from "@/types/userProfile";
import type { AuthUser } from "@/lib/auth";

interface UseProfileStateResult {
  user: AuthUser | null;
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  saving: boolean;
  setSaving: (value: boolean) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  resetProfileFromUser: () => void;
}

export const useProfileState = (): UseProfileStateResult => {
  const user: AuthUser | null = useUserStore((state) => state.user);
  const [profile, setProfile] = useState<UserProfile>({
    name: user?.name ?? "",
    email: user?.email ?? "",
    avatarUrl: user?.avatarUrl,
  });
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!user) return;

    setProfile({
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
    });
  }, [user]);

  const resetProfileFromUser = useCallback(() => {
    if (!user) return;

    setProfile({
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl ?? "",
    });
  }, [user]);

  return {
    user,
    profile,
    setProfile,
    isEditing,
    setIsEditing,
    saving,
    setSaving,
    fileInputRef,
    resetProfileFromUser,
  };
};
