import { format } from "date-fns";
import { useCallback, useEffect, useState } from "react";

import {
  GOAL_PERIOD_MESSAGES,
  goalPeriodOverlapMessage,
} from "@shared/utils/goalPeriod";

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
        return GOAL_PERIOD_MESSAGES.endBeforeStart;
      }
      if (latestGoalEndDate && start <= latestGoalEndDate) {
        return goalPeriodOverlapMessage(
          format(latestGoalEndDate, "yyyy-MM-dd"),
        );
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
