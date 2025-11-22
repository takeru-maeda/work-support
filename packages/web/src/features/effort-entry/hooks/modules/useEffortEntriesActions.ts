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
import { getProjectGroupKey } from "@/features/effort-entry/utils/projectGrouping";

interface UseEffortEntriesActionsParams {
  applyFormChange: (recipe: (draft: EffortFormData) => void) => void;
}

interface UseEffortEntriesActionsResult {
  entryErrors: Record<string, EffortEntryError | undefined>;
  setDate: (date?: Date) => void;
  setMemo: (value: string) => void;
  addEntry: (initial?: Partial<EffortEntry>) => void;
  removeEntry: (id: string) => void;
  updateEntry: (id: string, changes: Partial<EffortEntry>) => void;
  reorderProjectGroups: (sourceKey: string, targetKey: string) => void;
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

  const addEntry = useCallback(
    (initial?: Partial<EffortEntry>) => {
      applyFormChange((draft) => {
        const newEntry: EffortEntry = {
          ...createEmptyEntry(),
          ...(initial ?? {}),
        };
        draft.entries.push(newEntry);
      });
    },
    [applyFormChange],
  );

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
    },
    [applyFormChange],
  );

  const resetEntryErrors = useCallback(() => {
    setEntryErrors({});
  }, []);

  const reorderProjectGroups = useCallback(
    (sourceKey: string, targetKey: string) => {
      if (sourceKey === targetKey) return;
      applyFormChange((draft) => {
        const order: string[] = [];
        const grouped = new Map<string, EffortEntry[]>();

        for (const entry of draft.entries) {
          const key: string = getProjectGroupKey(entry);
          if (!grouped.has(key)) {
            grouped.set(key, []);
            order.push(key);
          }
          grouped.get(key)!.push(entry);
        }

        const sourceIndex = order.indexOf(sourceKey);
        const targetIndex = order.indexOf(targetKey);
        if (sourceIndex === -1 || targetIndex === -1) return;

        const reordered: string[] = arrayMove(order, sourceIndex, targetIndex);
        draft.entries = reordered.flatMap((key) => grouped.get(key) ?? []);
      });
    },
    [applyFormChange],
  );

  return {
    entryErrors,
    setEntryErrors,
    setDate,
    setMemo,
    addEntry,
    removeEntry,
    updateEntry,
    reorderProjectGroups,
    resetEntryErrors,
  };
}
