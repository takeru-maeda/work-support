import { useCallback, useState } from "react";

import type { PastGoal } from "@/features/goals/types";

interface UsePastGoalsSelectionResult {
  selectedGoal: PastGoal | null;
  isContentDialogOpen: boolean;
  handleViewContent: (goal: PastGoal) => void;
  handleContentDialogOpenChange: (open: boolean) => void;
}

export const usePastGoalsSelection = (): UsePastGoalsSelectionResult => {
  const [selectedGoal, setSelectedGoal] = useState<PastGoal | null>(null);
  const [isContentDialogOpen, setIsContentDialogOpen] =
    useState<boolean>(false);

  const handleViewContent = useCallback((goal: PastGoal) => {
    setSelectedGoal(goal);
    setIsContentDialogOpen(true);
  }, []);

  const handleContentDialogOpenChange = useCallback((open: boolean) => {
    setIsContentDialogOpen(open);
    if (!open) {
      setSelectedGoal(null);
    }
  }, []);

  return {
    selectedGoal,
    isContentDialogOpen,
    handleViewContent,
    handleContentDialogOpenChange,
  };
};
