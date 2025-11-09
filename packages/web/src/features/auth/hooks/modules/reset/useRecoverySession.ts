import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { supabase } from "@/lib/supabase";
import { getCurrentUser, type AuthUser } from "@/lib/auth";
import type { ResetPasswordStep } from "@/features/auth/hooks/useResetPasswordManager";

interface UseRecoverySessionOptions {
  setLoading: (loading: boolean) => void;
  setStep: (step: ResetPasswordStep) => void;
  setEmail: (email: string) => void;
  setError: (message: string) => void;
  resetErrorInfo: () => void;
}

/**
 * リカバリリンクからのアクセスを検知し、セッションを適用します。
 *
 * @param options 状態更新用コールバック
 */
export const useRecoverySession = ({
  setLoading,
  setStep,
  setEmail,
  setError,
  resetErrorInfo,
}: UseRecoverySessionOptions): void => {
  const location = useLocation();

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
        resetErrorInfo();
        setError(
          errorDescription
            ? errorDescription.replace(/\+/g, " ")
            : "パスワードリセットリンクが無効か期限切れです。再度お試しください。",
        );
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }

      const accessToken: string | null =
        hashParams.get("access_token") ?? searchParams.get("access_token");
      const refreshToken: string | null =
        hashParams.get("refresh_token") ?? searchParams.get("refresh_token");
      const type: string | null =
        hashParams.get("type") ?? searchParams.get("type");

      if (!accessToken || !refreshToken || type !== "recovery") return;

      setLoading(true);
      resetErrorInfo();

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        setError(sessionError.message);
        setLoading(false);
        return;
      }

      const currentUser: AuthUser | null = await getCurrentUser();
      if (currentUser?.email) {
        setEmail(currentUser.email);
      }

      setStep("password");
      setLoading(false);

      window.history.replaceState({}, "", window.location.pathname);
    };

    void applyRecoverySession();
  }, [
    location.hash,
    location.search,
    resetErrorInfo,
    setEmail,
    setError,
    setLoading,
    setStep,
  ]);
};
