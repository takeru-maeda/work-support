import { useCallback, useState } from "react";
import type { KeyedMutator } from "swr";

import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { reportUiError } from "@/services/logs";
import { removeEffortDraft, submitEffortEntries } from "@/services/effort";
import type {
  EffortEntryError,
  EffortFormData,
} from "@/features/effort-entry/types";
import {
  formatDateOnly,
  mapFormEntryToRequest,
  validateEffortEntry,
} from "@/features/effort-entry/utils/form-helpers";
import type {
  EffortEntry as EffortEntryDto,
  EffortEntriesRequest,
  EffortDraftResponse,
} from "@shared/schemas/effort";
import type { ProjectWithTasks } from "@shared/schemas/projects";

interface UseEffortSubmissionParams {
  formData: EffortFormData;
  setFormData: React.Dispatch<React.SetStateAction<EffortFormData>>;
  clearPersistedDraft: () => void;
  skipNextDraftSync: () => void;
  mutateDraft: KeyedMutator<EffortDraftResponse["draft"] | null>;
  mutateProjects: KeyedMutator<ProjectWithTasks[]>;
  setEntryErrors: React.Dispatch<
    React.SetStateAction<Record<string, EffortEntryError | undefined>>
  >;
  resetEntryErrors: () => void;
}

interface UseEffortSubmissionResult {
  isSubmitting: boolean;
  handleSubmit: () => Promise<void>;
}

/**
 * フォーム送信処理を提供します。
 *
 * @param params 送信に必要な状態
 * @returns 送信ハンドラ
 */
export function useEffortSubmission({
  formData,
  setFormData,
  clearPersistedDraft,
  skipNextDraftSync,
  mutateDraft,
  mutateProjects,
  setEntryErrors,
  resetEntryErrors,
}: UseEffortSubmissionParams): UseEffortSubmissionResult {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = useCallback(async () => {
    if (!formData.entries.length) {
      showErrorToast("工数エントリーを追加してください。");
      return;
    }

    const errors: Record<string, EffortEntryError | undefined> = {};
    const payload: EffortEntryDto[] = [];
    let hasError = false;

    for (const entry of formData.entries) {
      const entryError: EffortEntryError | null = validateEffortEntry(entry);
      if (entryError) {
        errors[entry.id] = entryError;
        hasError = true;
      }
      payload.push(mapFormEntryToRequest(entry));
    }

    if (hasError) {
      setEntryErrors(errors);
      showErrorToast("入力内容を確認してください。");
      return;
    }

    resetEntryErrors();
    setIsSubmitting(true);

    try {
      const requestBody: EffortEntriesRequest = {
        date: formatDateOnly(formData.date),
        entries: payload,
        memo: formData.memo.trim().length > 0 ? formData.memo : null,
      };
      await submitEffortEntries(requestBody);

      showSuccessToast("工数を登録しました。");

      skipNextDraftSync();
      setFormData({
        date: new Date(),
        entries: [],
        memo: "",
      });
      clearPersistedDraft();
      try {
        await removeEffortDraft();
        void mutateDraft(null, false);
      } catch (error) {
        void reportUiError(error, {
          message: "ドラフトの削除に失敗しました。",
        });
      }
      void mutateProjects();
    } catch (error) {
      showErrorToast("工数の送信に失敗しました。");
      void reportUiError(error, { message: "Failed to submit efforts" });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    clearPersistedDraft,
    formData.date,
    formData.entries,
    formData.memo,
    mutateDraft,
    mutateProjects,
    resetEntryErrors,
    setEntryErrors,
    setFormData,
    skipNextDraftSync,
  ]);

  return {
    isSubmitting,
    handleSubmit,
  };
}
