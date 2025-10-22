import type { FormEvent } from "react";

import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/config/routes";
import { AuthErrorAlert } from "@/features/auth/components/AuthErrorAlert";
import { AuthInfoAlert } from "@/features/auth/components/AuthInfoAlert";

interface ResetPasswordEmailFormProps {
  email: string;
  loading: boolean;
  error: string;
  info: string;
  onEmailChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

export function ResetPasswordEmailForm({
  email,
  loading,
  error,
  info,
  onEmailChange,
  onSubmit,
}: Readonly<ResetPasswordEmailFormProps>) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <AuthErrorAlert message={error} />
      {!error && <AuthInfoAlert message={info} />}

      <div className="space-y-2">
        <Label htmlFor="email">メールアドレス</Label>
        <Input
          id="email"
          type="email"
          placeholder="example@email.com"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "確認中..." : "次へ"}
      </Button>

      <div className="text-center text-sm">
        <Link to={ROUTES.login} className="text-primary hover:underline">
          ログインに戻る
        </Link>
      </div>
    </form>
  );
}
