import { useCallback, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/lib/supabase";
import { useResetPasswordState } from "@/features/auth/hooks/modules/reset/useResetPasswordState";
import { useRecoverySession } from "@/features/auth/hooks/modules/reset/useRecoverySession";
import {
  useEmailSubmission,
  usePasswordSubmission,
} from "@/features/auth/hooks/modules/reset/usePasswordResetSubmission";

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
  const {
    step,
    setStep,
    email,
    setEmail,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    error,
    setError,
    info,
    setInfo,
    loading,
    setLoading,
    resetErrorInfo,
  } = useResetPasswordState();

  useRecoverySession({
    setLoading,
    setStep,
    setEmail,
    setError,
    resetErrorInfo,
  });

  const handleEmailSubmit = useEmailSubmission({
    email,
    setLoading,
    setError,
    setInfo,
  });

  const handlePasswordSubmit = usePasswordSubmission({
    newPassword,
    confirmPassword,
    setLoading,
    setError,
    setInfo,
    navigate,
  });

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
