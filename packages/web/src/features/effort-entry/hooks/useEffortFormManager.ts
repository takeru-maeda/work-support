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
  addEntry: () => void;
  removeEntry: (id: string) => void;
  updateEntry: (id: string, changes: Partial<EffortEntry>) => void;
  handleSubmit: () => Promise<void>;
  projectBreakdown: ProjectBreakdownItem[];
  totalEstimated: number;
  totalActual: number;
  totalDifference: number;
  handleReorder: (activeId: string, overId: string) => void;
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
    clearPersistedDraft,
    mutateDraft,
  } = useEffortDraftSync();
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
    handleReorder,
    resetEntryErrors,
  } = useEffortEntriesActions({ setFormData });

  const { handleSubmit, isSubmitting } = useEffortSubmission({
    formData,
    setFormData,
    clearPersistedDraft,
    skipNextDraftSync,
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
    handleSubmit,
    projectBreakdown,
    totalEstimated,
    totalActual,
    totalDifference,
    handleReorder,
  };
}
