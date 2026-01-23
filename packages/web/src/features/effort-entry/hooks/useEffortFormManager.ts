import { useEffect, useRef } from "react";
import type {
  EffortEntry,
  EffortEntryError,
  EffortFormData,
  EffortProjectOption,
  ProjectBreakdownItem,
} from "@/features/effort-entry/types";
import { useEffortProjectsOptions } from "@/features/effort-entry/hooks/modules/useEffortProjectsOptions";
import { useEffortDraftSync } from "@/features/effort-entry/hooks/modules/useEffortDraftSync";
import { useEffortSummaryMetrics } from "@/features/effort-entry/hooks/modules/useEffortSummaryMetrics";
import { useEffortEntriesActions } from "@/features/effort-entry/hooks/modules/useEffortEntriesActions";
import { useEffortSubmission } from "@/features/effort-entry/hooks/modules/useEffortSubmission";
import { useEffortHistory } from "@/features/effort-entry/hooks/modules/useEffortHistory";

interface UseEffortFormManagerResult {
  formData: EffortFormData;
  projectOptions: EffortProjectOption[];
  isProjectLoading: boolean;
  isInitializing: boolean;
  isSubmitting: boolean;
  entryErrors: Record<string, EffortEntryError | undefined>;
  canSubmit: boolean;
  hasTotalEstimated: boolean;
  setDate: (date?: Date) => void;
  setMemo: (value: string) => void;
  addEntry: (initial?: Partial<EffortEntry>) => void;
  removeEntry: (id: string) => void;
  updateEntry: (id: string, changes: Partial<EffortEntry>) => void;
  reorderProjectGroups: (sourceKey: string, targetKey: string) => void;
  handleSubmit: () => Promise<void>;
  validateBeforeSubmit: () => boolean;
  projectBreakdown: ProjectBreakdownItem[];
  totalEstimated: number;
  totalActual: number;
  totalDifference: number;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * 工数入力フォーム全体の状態と操作ハンドラを提供します。
 *
 * @returns フォームデータとイベントハンドラ
 */
export function useEffortFormManager(): UseEffortFormManagerResult {
  const {
    formData,
    setFormData,
    isInitializing,
    skipNextDraftSync,
    cancelSync,
    clearPersistedDraft,
    mutateDraft,
  } = useEffortDraftSync();

  const {
    applyChange,
    undo,
    redo,
    canUndo,
    canRedo,
    replaceState,
    resetHistory,
  } = useEffortHistory(setFormData);

  const historyInitializedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isInitializing && !historyInitializedRef.current) {
      resetHistory();
      historyInitializedRef.current = true;
    }
  }, [isInitializing, resetHistory]);

  const { projectOptions, isProjectLoading, mutateProjects } =
    useEffortProjectsOptions();

  const {
    projectBreakdown,
    totalEstimated,
    totalActual,
    hasTotalEstimated,
    totalDifference,
  } = useEffortSummaryMetrics(formData.entries, projectOptions);

  const {
    entryErrors,
    setEntryErrors,
    setDate,
    setMemo,
    addEntry,
    removeEntry,
    updateEntry,
    reorderProjectGroups,
    resetEntryErrors,
  } = useEffortEntriesActions({ applyFormChange: applyChange });

  const { handleSubmit, isSubmitting, validateBeforeSubmit } =
    useEffortSubmission({
      formData,
      replaceFormState: replaceState,
      clearPersistedDraft,
      skipNextDraftSync,
      cancelSync,
      mutateDraft,
      mutateProjects,
      setEntryErrors,
      resetEntryErrors,
    });

  const canSubmit: boolean =
    formData.entries.length > 0 && !isSubmitting && !isInitializing;

  return {
    formData,
    projectOptions,
    isProjectLoading,
    isInitializing,
    isSubmitting,
    entryErrors,
    canSubmit,
    hasTotalEstimated,
    setDate,
    setMemo,
    addEntry,
    removeEntry,
    updateEntry,
    reorderProjectGroups,
    handleSubmit,
    validateBeforeSubmit,
    projectBreakdown,
    totalEstimated,
    totalActual,
    totalDifference,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
