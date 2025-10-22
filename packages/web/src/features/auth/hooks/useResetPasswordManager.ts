import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { ROUTES } from "@/config/routes";
import {
  getCurrentUser,
  requestPasswordReset,
  updatePassword,
} from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export type ResetPasswordStep = "email" | "password";

interface UseResetPasswordManagerResult {
  step: ResetPasswordStep;
  email: string;
  newPassword: string;
  confirmPassword: string;
  error: string;
  info: string;
  loading: boolean;
  onEmailChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  handleEmailSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handlePasswordSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleBackToEmail: () => Promise<void>;
}

export function useResetPasswordManager(): UseResetPasswordManagerResult {
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState<ResetPasswordStep>("email");
  const [email, setEmail] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const applyRecoverySession = async () => {
      if (typeof window === "undefined") return;

      const hashParams = new URLSearchParams(
        window.location.hash.replace(/^#/, ""),
      );
      const searchParams = new URLSearchParams(window.location.search);
      const errorParam = hashParams.get("error") ?? searchParams.get("error");
      const errorDescription =
        hashParams.get("error_description") ??
        searchParams.get("error_description");

      if (errorParam) {
        setLoading(false);
        setStep("email");
        setInfo("");
        setError(
          errorDescription
            ? errorDescription.replace(/\+/g, " ")
            : "パスワードリセットリンクが無効か期限切れです。再度お試しください。",
        );
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }

      const accessToken =
        hashParams.get("access_token") ?? searchParams.get("access_token");
      const refreshToken =
        hashParams.get("refresh_token") ?? searchParams.get("refresh_token");
      const type = hashParams.get("type") ?? searchParams.get("type");

      if (!accessToken || !refreshToken || type !== "recovery") return;

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

  const handleEmailSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError("");
      setInfo("");
      setLoading(true);

      const result = await requestPasswordReset(email);

      if (result.success) {
        setInfo(
          "パスワード再設定用のメールを送信しました。メールをご確認ください。",
        );
      } else {
        setError(
          result.error ?? "パスワードリセットメールの送信に失敗しました",
        );
      }

      setLoading(false);
    },
    [email],
  );

  const handlePasswordSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
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
    },
    [confirmPassword, navigate, newPassword],
  );

  const handleBackToEmail = useCallback(async () => {
    setStep("email");
    setError("");
    setInfo("");
    setNewPassword("");
    setConfirmPassword("");
    await supabase.auth.signOut();
  }, []);

  const onEmailChange = useCallback((value: string) => {
    setEmail(value);
  }, []);

  const onNewPasswordChange = useCallback((value: string) => {
    setNewPassword(value);
  }, []);

  const onConfirmPasswordChange = useCallback((value: string) => {
    setConfirmPassword(value);
  }, []);

  return {
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
  };
}
