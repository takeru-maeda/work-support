import type React from "react";

import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/config/routes";
import { AuthPageContainer } from "@/pages/auth/components/AuthPageContainer";
import { AuthBrand } from "@/pages/auth/components/AuthBrand";
import {
  requestPasswordReset,
  updatePassword,
  getCurrentUser,
} from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const applyRecoverySession = async () => {
      if (typeof window === "undefined") return;

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const searchParams = new URLSearchParams(window.location.search);
      const accessToken = hashParams.get("access_token") ?? searchParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token") ?? searchParams.get("refresh_token");
      const type = hashParams.get("type") ?? searchParams.get("type");

      if (!accessToken || !refreshToken || type !== "recovery") {
        return;
      }

      setLoading(true);
      setError("");
      setInfo("");

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        setError(sessionError.message);
        setLoading(false);
        return;
      }

      const currentUser = await getCurrentUser();
      if (currentUser?.email) {
        setEmail(currentUser.email);
      }

      setStep("password");
      setLoading(false);

      window.history.replaceState({}, "", window.location.pathname);
    };

    void applyRecoverySession();
  }, [location.hash, location.search]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    const result = await requestPasswordReset(email);

    if (result.success) {
      setInfo("パスワード再設定用のメールを送信しました。メールをご確認ください。");
    } else {
      setError(result.error ?? "パスワードリセットメールの送信に失敗しました");
    }

    setLoading(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (newPassword !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    if (newPassword.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      return;
    }

    setLoading(true);

    const result = await updatePassword(newPassword);

    if (result.success) {
      await supabase.auth.signOut();
      setLoading(false);
      navigate(`${ROUTES.login}?reset=success`, { replace: true });
      return;
    }

    setError(result.error ?? "パスワードのリセットに失敗しました");
    setLoading(false);
  };

  const handleBackToEmail = async () => {
    setStep("email");
    setError("");
    setInfo("");
    setNewPassword("");
    setConfirmPassword("");
    await supabase.auth.signOut();
  };

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
        <form onSubmit={handleEmailSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/20 rounded-md">
              {error}
            </div>
          )}

          {info && !error && (
            <div className="p-3 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 rounded-md">
              {info}
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

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "確認中..." : "次へ"}
          </Button>

          <div className="text-center text-sm">
            <Link to={ROUTES.login} className="text-primary hover:underline">
              ログインに戻る
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={handlePasswordSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/20 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="newPassword">新しいパスワード</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
              onChange={(e) => setConfirmPassword(e.target.value)}
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
                void handleBackToEmail();
              }}
              className="text-primary hover:underline"
            >
              メールアドレスを変更
            </button>
          </div>
        </form>
      )}
    </AuthPageContainer>
  );
}
