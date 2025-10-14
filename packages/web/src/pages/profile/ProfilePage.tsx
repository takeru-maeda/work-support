import type { ChangeEvent } from "react";

import { useEffect, useRef, useState } from "react";
import { Camera, User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile, type AuthResult, type AuthUser } from "@/lib/auth";
import { getInitials } from "@/lib/getInitials";
import { useUserStore } from "@/store/user";
import type { UserProfile } from "@/types/userProfile";

export default function ProfilePage() {
  const user: AuthUser | null = useUserStore((s) => s.user);
  const setUser = useUserStore.getState().setUser;
  const [profile, setProfile] = useState<UserProfile>({
    name: user?.name ?? "",
    avatarUrl: user?.avatarUrl,
  });
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    setProfile({
      name: user.name,
      avatarUrl: user.avatarUrl,
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setError("");

    const result: AuthResult = await updateProfile({
      name: profile.name,
      avatarUrl: profile.avatarUrl,
    });

    if (result.success) {
      const updatedUser: AuthUser = result.user ?? {
        ...user,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
      };
      setUser(updatedUser);
      setIsEditing(false);
    } else {
      setError(result.error ?? "プロフィールの更新に失敗しました");
    }

    setSaving(false);
  };

  const handleCancel = () => {
    if (!user) return;

    setProfile({
      name: user.name,
      avatarUrl: user.avatarUrl ?? "",
    });
    setIsEditing(false);
    setError("");
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfile((prev) => ({
        ...prev,
        avatarUrl:
          typeof reader.result === "string" ? reader.result : prev.avatarUrl,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div
            className="relative group cursor-pointer"
            onClick={handleAvatarClick}
          >
            <Avatar className="h-20 w-20">
              {profile.avatarUrl && (
                <AvatarImage
                  src={profile.avatarUrl || "/placeholder.svg"}
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
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-8 w-8 text-white" />
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <div>
            <h1 className="text-3xl font-bold">プロフィール</h1>
            <p className="text-muted-foreground">アカウント情報を管理</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card text-card-foreground shadow-sm p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                名前
              </Label>
              {isEditing ? (
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(event) =>
                    setProfile((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  placeholder="山田 太郎"
                />
              ) : (
                <p className="text-foreground py-2">
                  {profile.name || "未設定"}
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  キャンセル
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "保存中..." : "保存"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>編集</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
