import type { FormEvent } from "react";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/config/routes";
import { signup } from "@/lib/auth";
import { AuthBrand } from "@/features/auth/components/AuthBrand";
import { AuthErrorAlert } from "@/features/auth/components/AuthErrorAlert";
import { AuthPageContainer } from "@/features/auth/components/AuthPageContainer";
import { createUserSettings } from "@/services/userSettings";
import { reportUiError } from "@/services/logs";
import { showSuccessToast } from "@/lib/toast";
import { PasswordInput } from "@/features/auth/components/PasswordInput";

export default function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    if (password.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      return;
    }

    setLoading(true);

    const result = await signup(name, email, password);

    if (result.success) {
      try {
        await createUserSettings();
      } catch (createError) {
        reportUiError(createError, {
          message: "Failed to initialize user settings",
        });
      }
      showSuccessToast(
        "確認メールをお送りしました。メール内の手順に従ってアカウントを有効化してください。",
      );
      navigate(ROUTES.home);
    } else {
      setError(result.error || "登録に失敗しました");
    }

    setLoading(false);
  };

  return (
    <AuthPageContainer>
      <AuthBrand title="新規登録" subtitle="アカウントを作成してください" />

      <form onSubmit={handleSubmit} className="space-y-6">
        <AuthErrorAlert message={error} />

        <div className="space-y-2">
          <Label htmlFor="name">名前</Label>
          <Input
            id="name"
            type="text"
            placeholder="山田太郎"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">メールアドレス</Label>
          <Input
            id="email"
            type="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <PasswordInput
          id="password"
          label="パスワード"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />

        <PasswordInput
          id="confirmPassword"
          label="パスワード（確認）"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          showLabel="確認用パスワードを表示"
          hideLabel="確認用パスワードを非表示"
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "登録中..." : "登録"}
        </Button>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">
            既にアカウントをお持ちの方は{" "}
          </span>
          <Link to={ROUTES.login} className="text-primary hover:underline">
            ログイン
          </Link>
        </div>
      </form>
    </AuthPageContainer>
  );
}
