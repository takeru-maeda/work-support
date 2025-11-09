import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";

interface UseAddGoalPeriodValidationOptions {
  latestGoalEndDate?: Date;
  periodStart?: Date;
  periodEnd?: Date;
}

interface UseAddGoalPeriodValidationResult {
  periodError: string | null;
  isPeriodValid: boolean;
  validatePeriod: (start?: Date, end?: Date) => string | null;
  setPeriodError: (error: string | null) => void;
}

export const useAddGoalPeriodValidation = ({
  latestGoalEndDate,
  periodStart,
  periodEnd,
}: UseAddGoalPeriodValidationOptions): UseAddGoalPeriodValidationResult => {
  const [periodError, setPeriodError] = useState<string | null>(null);

  const validatePeriod = useCallback(
    (start?: Date, end?: Date): string | null => {
      if (!start || !end) {
        return null;
      }
      if (end <= start) {
        return "終了日は開始日より未来の日付を選択してください。";
      }
      if (latestGoalEndDate && start <= latestGoalEndDate) {
        return `開始日は既存目標の終了日（${format(
          latestGoalEndDate,
          "yyyy/MM/dd",
        )}）より未来の日付を選択してください。`;
      }
      return null;
    },
    [latestGoalEndDate],
  );

  useEffect(() => {
    setPeriodError(validatePeriod(periodStart, periodEnd));
  }, [periodEnd, periodStart, validatePeriod]);

  const isPeriodValid =
    Boolean(periodStart) && Boolean(periodEnd) && !periodError;

  return {
    periodError,
    isPeriodValid,
    validatePeriod,
    setPeriodError,
  };
};
