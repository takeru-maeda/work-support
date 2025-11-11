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
  setFormData: React.Dispatch<React.SetStateAction<EffortFormData>>;
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
  setFormData,
}: UseEffortEntriesActionsParams): UseEffortEntriesActionsResult {
  const [entryErrors, setEntryErrors] = useState<
    Record<string, EffortEntryError | undefined>
  >({});

  const setDate = useCallback(
    (date?: Date) => {
      setFormData((prev) => ({
        ...prev,
        date: date ?? new Date(),
      }));
    },
    [setFormData],
  );

  const setMemo = useCallback(
    (value: string) => {
      setFormData((prev) => ({
        ...prev,
        memo: value,
      }));
    },
    [setFormData],
  );

  const addEntry = useCallback(() => {
    setFormData((prev) => {
      const newEntry: EffortEntry = createEmptyEntry();
      if (prev.entries.length > 0) {
        const lastEntry: EffortEntry = prev.entries.at(-1)!;
        newEntry.projectId = lastEntry.projectId ?? null;
        newEntry.projectName = lastEntry.projectName;
      }
      console.log(newEntry);
      return { ...prev, entries: [...prev.entries, newEntry] };
    });
  }, [setFormData]);

  const removeEntry = useCallback(
    (id: string) => {
      setFormData((prev) => ({
        ...prev,
        entries: prev.entries.filter((entry) => entry.id !== id),
      }));
      setEntryErrors((prev) => {
        if (!prev[id]) return prev;
        const { [id]: _removed, ...rest } = prev;
        return rest;
      });
    },
    [setFormData],
  );

  const updateEntry = useCallback(
    (id: string, changes: Partial<EffortEntry>) => {
      setFormData((prev) => {
        let updated: EffortEntry | null = null;
        const entries: EffortEntry[] = prev.entries.map((entry) => {
          if (entry.id !== id) return entry;
          updated = { ...entry, ...changes };
          return updated;
        });

        if (updated) {
          setEntryErrors((prevErrors) => {
            const nextError: EffortEntryError | null = validateEffortEntry(
              updated as EffortEntry,
            );
            if (nextError) {
              return { ...prevErrors, [id]: nextError };
            }
            if (!prevErrors[id]) return prevErrors;
            const { [id]: _removed, ...rest } = prevErrors;
            return rest;
          });
        }

        return { ...prev, entries };
      });
    },
    [setFormData],
  );

  const handleReorder = useCallback(
    (activeId: string, overId: string) => {
      if (activeId === overId) return;
      setFormData((prev) => {
        const oldIndex: number = prev.entries.findIndex(
          (entry) => entry.id === activeId,
        );
        const newIndex: number = prev.entries.findIndex(
          (entry) => entry.id === overId,
        );
        if (oldIndex === -1 || newIndex === -1) return prev;
        return {
          ...prev,
          entries: arrayMove(prev.entries, oldIndex, newIndex),
        };
      });
    },
    [setFormData],
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
