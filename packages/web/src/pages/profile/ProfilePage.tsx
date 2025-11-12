import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";

import { SectionHeader } from "@/components/sections/SectionHeader";
import CardContainer from "@/components/shared/CardContainer";
import { PageContainer } from "@/components/shared/PageContainer";
import LoadingSpinner from "@/components/spinner/LoadingSpinner";
import { ProfileHeader } from "@/features/profile/components/ProfileHeader";
import { ProfileNameSection } from "@/features/profile/components/ProfileNameSection";
import { useProfileManager } from "@/features/profile/hooks/useProfileManager";
import { AccountDeletionSection } from "@/features/profile/components/AccountDeletionSection";
import { deleteCurrentUser } from "@/services/users";
import { logout } from "@/lib/auth";
import { ROUTES } from "@/config/routes";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { reportUiError } from "@/services/logs";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [isDeletingAccount, setIsDeletingAccount] = useState<boolean>(false);
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

  const handleAccountDeletion = useCallback(async (): Promise<boolean> => {
    if (isDeletingAccount) return false;
    setIsDeletingAccount(true);
    try {
      await deleteCurrentUser();
      await logout();
      showSuccessToast("アカウントを削除しました。");
      navigate(ROUTES.login, { replace: true });
      return true;
    } catch (error) {
      showErrorToast("アカウントの削除に失敗しました。");
      void reportUiError(error, { message: "Failed to delete user" });
      return false;
    } finally {
      setIsDeletingAccount(false);
    }
  }, [isDeletingAccount, navigate]);

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
          <LoadingSpinner loading={saving || isDeletingAccount} />
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

        <AccountDeletionSection
          email={profile.email}
          isDeleting={isDeletingAccount}
          onConfirm={handleAccountDeletion}
        />
      </div>
    </PageContainer>
  );
}
