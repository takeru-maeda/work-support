import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/config/routes";
import { AuthBrand } from "@/features/auth/components/AuthBrand";
import { AuthErrorAlert } from "@/features/auth/components/AuthErrorAlert";
import { AuthPageContainer } from "@/features/auth/components/AuthPageContainer";
import { PasswordInput } from "@/features/auth/components/PasswordInput";
import { safeRedirectPath } from "@/features/auth/utils/redirect";
import { login } from "@/lib/auth";

import type { FormEvent } from "react";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      navigate(safeRedirectPath(searchParams.get("redirect")));
    } else {
      setError(result.error || "ログインに失敗しました");
    }

    setLoading(false);
  };

  return (
    <AuthPageContainer>
      <AuthBrand title="ログイン" subtitle="アカウントにログインしてください" />

      <form onSubmit={handleSubmit} className="space-y-6">
        <AuthErrorAlert message={error} />

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

        <div className="space-y-2">
          <PasswordInput
            id="password"
            label="パスワード"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "ログイン中..." : "ログイン"}
        </Button>

        <div className="text-center text-sm">
          <Link
            to={ROUTES.resetPassword}
            className="text-primary hover:underline"
          >
            パスワードをお忘れですか？
          </Link>
        </div>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">
            アカウントをお持ちでない方は{" "}
          </span>
          <Link to={ROUTES.signup} className="text-primary hover:underline">
            新規登録
          </Link>
        </div>
      </form>
    </AuthPageContainer>
  );
}
