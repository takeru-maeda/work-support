import { useCallback, useState } from "react";

import type { ResetPasswordStep } from "@/features/auth/hooks/useResetPasswordManager";

interface UseResetPasswordStateResult {
  step: ResetPasswordStep;
  setStep: (step: ResetPasswordStep) => void;
  email: string;
  setEmail: (value: string) => void;
  newPassword: string;
  setNewPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  error: string;
  setError: (value: string) => void;
  info: string;
  setInfo: (value: string) => void;
  loading: boolean;
  setLoading: (value: boolean) => void;
  resetErrorInfo: () => void;
}

export const useResetPasswordState = (): UseResetPasswordStateResult => {
  const [step, setStep] = useState<ResetPasswordStep>("email");
  const [email, setEmail] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const resetErrorInfo = useCallback(() => {
    setError("");
    setInfo("");
  }, []);

  return {
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
  };
};
