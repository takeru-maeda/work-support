import { useCallback } from "react";
import type { FormEvent } from "react";

import {
  requestPasswordReset,
  updatePassword,
  type BasicResult,
} from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { ROUTES } from "@/config/routes";
import type { NavigateFunction } from "react-router-dom";

interface UseEmailSubmissionOptions {
  email: string;
  setLoading: (loading: boolean) => void;
  setError: (message: string) => void;
  setInfo: (message: string) => void;
}

interface UsePasswordSubmissionOptions {
  newPassword: string;
  confirmPassword: string;
  setLoading: (loading: boolean) => void;
  setError: (message: string) => void;
  setInfo: (message: string) => void;
  navigate: NavigateFunction;
}

/**
 * パスワードリセットメール送信処理を提供します。
 *
 * @param options 状態更新用の関数群
 * @returns 送信ハンドラ
 */
export const useEmailSubmission = ({
  email,
  setLoading,
  setError,
  setInfo,
}: UseEmailSubmissionOptions) => {
  return useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError("");
      setInfo("");
      setLoading(true);

      const result: BasicResult = await requestPasswordReset(email);

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
    [email, setError, setInfo, setLoading],
  );
};

/**
 * 新しいパスワードの保存処理を提供します。
 *
 * @param options 状態更新用の関数群
 * @returns パスワード送信ハンドラ
 */
export const usePasswordSubmission = ({
  newPassword,
  confirmPassword,
  setLoading,
  setError,
  setInfo,
  navigate,
}: UsePasswordSubmissionOptions) => {
  return useCallback(
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
    [confirmPassword, navigate, newPassword, setError, setInfo, setLoading],
  );
};
