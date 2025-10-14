import type { FormEvent } from "react";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/config/routes";
import { getCurrentUser, login } from "@/lib/auth";
import { AuthPageContainer } from "@/pages/auth/components/AuthPageContainer";
import { AuthBrand } from "@/pages/auth/components/AuthBrand";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);
    await getCurrentUser();

    if (result.success) {
      navigate(ROUTES.home);
    } else {
      setError(result.error || "ログインに失敗しました");
    }

    setLoading(false);
  };

  return (
    <AuthPageContainer>
      <AuthBrand title="ログイン" subtitle="アカウントにログインしてください" />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/20 rounded-md">
            {error}
            </div>
          )}

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
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
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
              パスワードを忘れた方
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
