import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthErrorAlert } from "@/features/auth/components/AuthErrorAlert";

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

      <div className="space-y-2">
        <Label htmlFor="newPassword">新しいパスワード</Label>
        <Input
          id="newPassword"
          type="password"
          placeholder="••••••••"
          value={newPassword}
          onChange={(event) => onNewPasswordChange(event.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">パスワード確認</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(event) => onConfirmPasswordChange(event.target.value)}
          required
        />
      </div>

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
