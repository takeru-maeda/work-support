import { useCallback, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";

import type {
  EffortEntry,
  EffortEntryError,
  EffortFormData,
} from "@/features/effort-entry/types";
import {
  createEmptyEntry,
  validateEffortEntry,
} from "@/features/effort-entry/utils/form-helpers";

interface UseEffortEntriesActionsParams {
  applyFormChange: (recipe: (draft: EffortFormData) => void) => void;
}

interface UseEffortEntriesActionsResult {
  entryErrors: Record<string, EffortEntryError | undefined>;
  setDate: (date?: Date) => void;
  setMemo: (value: string) => void;
  addEntry: () => void;
  removeEntry: (id: string) => void;
  updateEntry: (id: string, changes: Partial<EffortEntry>) => void;
  handleReorder: (activeId: string, overId: string) => void;
  resetEntryErrors: () => void;
  setEntryErrors: React.Dispatch<
    React.SetStateAction<Record<string, EffortEntryError | undefined>>
  >;
}

/**
 * 工数エントリの編集操作とエラー状態を管理します。
 *
 * @param params フォームデータと setter
 * @returns 編集用ハンドラ群
 */
export function useEffortEntriesActions({
  applyFormChange,
}: UseEffortEntriesActionsParams): UseEffortEntriesActionsResult {
  const [entryErrors, setEntryErrors] = useState<
    Record<string, EffortEntryError | undefined>
  >({});

  const setDate = useCallback(
    (date?: Date) => {
      applyFormChange((draft) => {
        draft.date = date ?? new Date();
      });
    },
    [applyFormChange],
  );

  const setMemo = useCallback(
    (value: string) => {
      applyFormChange((draft) => {
        draft.memo = value;
      });
    },
    [applyFormChange],
  );

  const addEntry = useCallback(() => {
    applyFormChange((draft) => {
      const newEntry: EffortEntry = createEmptyEntry();
      if (draft.entries.length > 0) {
        const lastEntry: EffortEntry = draft.entries.at(-1)!;
        newEntry.projectId = lastEntry.projectId ?? null;
        newEntry.projectName = lastEntry.projectName;
      }
      draft.entries.push(newEntry);
    });
  }, [applyFormChange]);

  const removeEntry = useCallback(
    (id: string) => {
      applyFormChange((draft) => {
        draft.entries = draft.entries.filter((entry) => entry.id !== id);
      });
      setEntryErrors((prev) => {
        if (!prev[id]) return prev;
        const { [id]: _removed, ...rest } = prev;
        return rest;
      });
    },
    [applyFormChange],
  );

  const updateEntry = useCallback(
    (id: string, changes: Partial<EffortEntry>) => {
      let updated: EffortEntry | null = null;
      applyFormChange((draft) => {
        const target: EffortEntry | undefined = draft.entries.find(
          (entry) => entry.id === id,
        );
        if (!target) return;
        Object.assign(target, changes);
        updated = { ...target };
      });

      if (updated) {
        setEntryErrors((prevErrors) => {
          const nextError: EffortEntryError | null =
            validateEffortEntry(updated as EffortEntry);
          if (nextError) {
            return { ...prevErrors, [id]: nextError };
          }
          if (!prevErrors[id]) return prevErrors;
          const { [id]: _removed, ...rest } = prevErrors;
          return rest;
        });
      }
    },
    [applyFormChange],
  );

  const handleReorder = useCallback(
    (activeId: string, overId: string) => {
      if (activeId === overId) return;
      applyFormChange((draft) => {
        const oldIndex: number = draft.entries.findIndex(
          (entry) => entry.id === activeId,
        );
        const newIndex: number = draft.entries.findIndex(
          (entry) => entry.id === overId,
        );
        if (oldIndex === -1 || newIndex === -1) {
          return;
        }
        draft.entries = arrayMove(draft.entries, oldIndex, newIndex);
      });
    },
    [applyFormChange],
  );

  const resetEntryErrors = useCallback(() => {
    setEntryErrors({});
  }, []);

  return {
    entryErrors,
    setEntryErrors,
    setDate,
    setMemo,
    addEntry,
    removeEntry,
    updateEntry,
    handleReorder,
    resetEntryErrors,
  };
}
