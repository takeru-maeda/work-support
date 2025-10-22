import { FormActions } from "@/components/form/FormActions";
import { Button } from "@/components/ui/button";
import { ProfileHeader } from "@/features/profile/components/ProfileHeader";
import { ProfileNameSection } from "@/features/profile/components/ProfileNameSection";
import { useProfileManager } from "@/features/profile/hooks/useProfileManager";

export default function ProfilePage() {
  const {
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
  } = useProfileManager();

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <div className="space-y-6">
        <ProfileHeader
          profile={profile}
          fileInputRef={fileInputRef}
          onAvatarClick={handleAvatarClick}
          onImageUpload={handleImageUpload}
          disabled={saving}
        />

        <div className="rounded-lg border border-border bg-card text-card-foreground shadow-sm p-6 space-y-6">
          <div className="space-y-4">
            <ProfileNameSection
              isEditing={isEditing}
              name={profile.name ?? ""}
              onChange={handleNameChange}
            />
          </div>

          <div className="flex gap-2 justify-end">
            {isEditing ? (
              <FormActions
                saveLabel={saving ? "保存中..." : "保存"}
                onCancel={handleCancel}
                onSave={handleSave}
                saveDisabled={saving}
              />
            ) : (
              <Button onClick={beginEditing} disabled={saving}>
                編集
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
