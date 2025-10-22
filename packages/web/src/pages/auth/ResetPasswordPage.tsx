import { AuthBrand } from "@/features/auth/components/AuthBrand";
import { AuthPageContainer } from "@/features/auth/components/AuthPageContainer";
import { ResetPasswordEmailForm } from "@/features/auth/components/ResetPasswordEmailForm";
import { ResetPasswordNewPasswordForm } from "@/features/auth/components/ResetPasswordNewPasswordForm";
import { useResetPasswordManager } from "@/features/auth/hooks/useResetPasswordManager";

export default function ResetPasswordPage() {
  const {
    step,
    email,
    newPassword,
    confirmPassword,
    error,
    info,
    loading,
    onEmailChange,
    onNewPasswordChange,
    onConfirmPasswordChange,
    handleEmailSubmit,
    handlePasswordSubmit,
    handleBackToEmail,
  } = useResetPasswordManager();

  return (
    <AuthPageContainer>
      <AuthBrand
        title="パスワードリセット"
        subtitle={
          step === "email"
            ? "登録されているメールアドレスを入力してください"
            : "新しいパスワードを入力してください"
        }
      />

      {step === "email" ? (
        <ResetPasswordEmailForm
          email={email}
          loading={loading}
          error={error}
          info={info}
          onEmailChange={onEmailChange}
          onSubmit={handleEmailSubmit}
        />
      ) : (
        <ResetPasswordNewPasswordForm
          newPassword={newPassword}
          confirmPassword={confirmPassword}
          loading={loading}
          error={error}
          onNewPasswordChange={onNewPasswordChange}
          onConfirmPasswordChange={onConfirmPasswordChange}
          onSubmit={handlePasswordSubmit}
          onBackToEmail={handleBackToEmail}
        />
      )}
    </AuthPageContainer>
  );
}
