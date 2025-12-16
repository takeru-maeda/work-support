import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { AuthErrorAlert } from "@/features/auth/components/AuthErrorAlert";
import { PasswordInput } from "@/features/auth/components/PasswordInput";

interface ResetPasswordNewPasswordFormProps {
  newPassword: string;
  confirmPassword: string;
  loading: boolean;
  error: string;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onBackToEmail: () => Promise<void>;
}

export function ResetPasswordNewPasswordForm({
  newPassword,
  confirmPassword,
  loading,
  error,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  onBackToEmail,
}: Readonly<ResetPasswordNewPasswordFormProps>) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <AuthErrorAlert message={error} />

      <PasswordInput
        id="newPassword"
        label="新しいパスワード"
        placeholder="••••••••"
        value={newPassword}
        onChange={(event) => onNewPasswordChange(event.target.value)}
        required
      />

      <PasswordInput
        id="confirmPassword"
        label="パスワード確認"
        placeholder="••••••••"
        value={confirmPassword}
        onChange={(event) => onConfirmPasswordChange(event.target.value)}
        required
      />

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "リセット中..." : "パスワードをリセット"}
      </Button>

      <div className="text-center text-sm">
        <button
          type="button"
          onClick={() => {
            void onBackToEmail();
          }}
          className="text-primary hover:underline"
        >
          メールアドレスを変更
        </button>
      </div>
    </form>
  );
}
