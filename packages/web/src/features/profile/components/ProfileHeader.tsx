import { Camera, User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import type { UserProfile } from "@/types/userProfile";

import type { ChangeEvent, RefObject } from "react";

interface ProfileHeaderProps {
  profile: UserProfile;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onAvatarClick: () => void;
  onImageUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

export function ProfileHeader({
  profile,
  fileInputRef,
  onAvatarClick,
  onImageUpload,
  disabled = false,
}: Readonly<ProfileHeaderProps>) {
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        aria-label="プロフィール画像を変更"
        onClick={onAvatarClick}
        disabled={disabled}
        className="relative group cursor-pointer rounded-full border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed"
      >
        <Avatar className="h-20 w-20">
          {profile.avatarUrl && (
            <AvatarImage
              src={profile.avatarUrl || "/placeholder-user.svg"}
              alt={profile.name}
            />
          )}
          <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
            {profile.name ? (
              getInitials(profile.name) || "U"
            ) : (
              <User className="h-10 w-10" />
            )}
          </AvatarFallback>
        </Avatar>
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <Camera className="h-8 w-8 text-white" />
        </span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onImageUpload}
        className="hidden"
      />
      <div>
        <h1 className="text-3xl font-bold">プロフィール</h1>
        <p className="text-muted-foreground">アカウント情報を管理</p>
      </div>
    </div>
  );
}
