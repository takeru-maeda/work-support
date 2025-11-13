import { useCallback, useMemo, useRef, useState } from "react";
import {
  applyPatches,
  enablePatches,
  produceWithPatches,
  type Patch,
} from "immer";

enablePatches();

import type { EffortFormData } from "@/features/effort-entry/types";

interface HistoryEntry {
  patches: Patch[];
  inversePatches: Patch[];
}

export interface EffortHistoryResult {
  applyChange: (recipe: (draft: EffortFormData) => void) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  replaceState: (
    nextState: EffortFormData,
    options?: { resetHistory?: boolean },
  ) => void;
  resetHistory: () => void;
}

/**
 * Immer のパッチを利用してフォーム状態の Undo / Redo を管理します。
 *
 * @param setFormData フォーム状態 setter
 * @returns ヒストリー制御用のハンドラ
 */
export function useEffortHistory(
  setFormData: React.Dispatch<React.SetStateAction<EffortFormData>>,
): EffortHistoryResult {
  const pastRef = useRef<HistoryEntry[]>([]);
  const futureRef = useRef<HistoryEntry[]>([]);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  const resetHistory = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  const updateHistoryFlags = useCallback(() => {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  const applyChange = useCallback(
    (recipe: (draft: EffortFormData) => void) => {
      setFormData((current) => {
        const [nextState, patches, inversePatches] = produceWithPatches(
          current,
          recipe,
        );
        if (patches.length === 0) {
          return current;
        }

        pastRef.current = [...pastRef.current, { patches, inversePatches }];
        futureRef.current = [];
        setCanUndo(true);
        setCanRedo(false);
        return nextState;
      });
    },
    [setFormData],
  );

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) {
      return;
    }
    const entry: HistoryEntry = pastRef.current.at(-1)!;
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [entry, ...futureRef.current];

    setFormData((current) => applyPatches(current, entry.inversePatches));
    updateHistoryFlags();
  }, [setFormData, updateHistoryFlags]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) {
      return;
    }
    const [entry, ...rest] = futureRef.current;
    futureRef.current = rest;
    pastRef.current = [...pastRef.current, entry];

    setFormData((current) => applyPatches(current, entry.patches));
    updateHistoryFlags();
  }, [setFormData, updateHistoryFlags]);

  const replaceState = useCallback(
    (
      nextState: EffortFormData,
      options: { resetHistory?: boolean } = { resetHistory: true },
    ) => {
      setFormData(nextState);
      if (options.resetHistory !== false) {
        resetHistory();
      } else {
        updateHistoryFlags();
      }
    },
    [resetHistory, setFormData, updateHistoryFlags],
  );

  return useMemo(
    () => ({
      applyChange,
      undo,
      redo,
      canUndo,
      canRedo,
      replaceState,
      resetHistory,
    }),
    [applyChange, canRedo, canUndo, redo, replaceState, resetHistory, undo],
  );
}
