import { SectionHeader } from "@/components/sections/SectionHeader";
import CardContainer from "@/components/shared/CardContainer";
import { PageContainer } from "@/components/shared/PageContainer";
import LoadingSpinner from "@/components/spinner/LoadingSpinner";
import { ProfileHeader } from "@/features/profile/components/ProfileHeader";
import { ProfileNameSection } from "@/features/profile/components/ProfileNameSection";
import { useProfileManager } from "@/features/profile/hooks/useProfileManager";
import { Mail } from "lucide-react";

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
    <PageContainer>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <ProfileHeader
            profile={profile}
            fileInputRef={fileInputRef}
            onAvatarClick={handleAvatarClick}
            onImageUpload={handleImageUpload}
            disabled={saving}
          />
          <LoadingSpinner loading={saving} />
        </div>

        <CardContainer className="space-y-4">
          <SectionHeader
            icon={Mail}
            iconClassName="bg-primary/10 text-primary"
            title="メールアドレス"
            titleClassName="text-md"
          />
          <p>{profile.email}</p>
        </CardContainer>

        <ProfileNameSection
          name={profile.name ?? ""}
          isEditing={isEditing}
          saving={saving}
          onChange={handleNameChange}
          onCancel={handleCancel}
          onSave={handleSave}
          beginEditing={beginEditing}
        />
      </div>
    </PageContainer>
  );
}
