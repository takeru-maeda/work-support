import { useEffect, useRef, useState } from "react";
import type React from "react";
import type { KeyedMutator } from "swr";

import { buildUserScopedKey } from "@/lib/utils";
import { showErrorToast } from "@/lib/toast";
import { reportUiError } from "@/services/logs";
import { saveEffortDraft, useEffortDraft } from "@/services/effort";
import type {
  EffortEntry,
  EffortFormData,
} from "@/features/effort-entry/types";
import {
  createInitialFormData,
  ensureProjectGroupId,
  formatDateOnly,
  mapDraftEntryToFormEntry,
  mapFormEntryToRequest,
} from "@/features/effort-entry/utils/form-helpers";
import type { EffortDraft, EffortDraftResponse } from "@shared/schemas/effort";

const LOCAL_STORAGE_BASE_KEY = "effort:entry:form";
const DRAFT_SYNC_DELAY_MS = 800;

interface DraftSource {
  formData: EffortFormData;
  timestamp: string | null;
}

interface PersistedFormPayload {
  date: string | null;
  memo: string;
  entries: EffortEntry[];
  clientUpdatedAt?: string | null;
}

export interface EffortDraftSyncResult {
  formData: EffortFormData;
  setFormData: React.Dispatch<React.SetStateAction<EffortFormData>>;
  isInitializing: boolean;
  skipNextDraftSync: () => void;
  cancelSync: () => void;
  clearPersistedDraft: () => void;
  mutateDraft: KeyedMutator<EffortDraftResponse["draft"] | null>;
}

/**
 * 工数ドラフトの保存・取得を管理します。
 *
 * @param userId ユーザーID
 * @returns ドラフト同期に関する状態と操作
 */
export function useEffortDraftSync(): EffortDraftSyncResult {
  const storageKey: string | null = buildUserScopedKey(LOCAL_STORAGE_BASE_KEY);
  const [formData, setFormData] = useState<EffortFormData>(
    createInitialFormData,
  );
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [canSyncDraft, setCanSyncDraft] = useState<boolean>(false);
  const skipDraftSyncRef = useRef<boolean>(false);
  const draftSyncTimeoutRef = useRef<number | null>(null);
  const hasInitializedRef = useRef<boolean>(false);

  const {
    data: remoteDraft,
    error: draftError,
    isLoading: draftLoading,
    mutate,
  } = useEffortDraft({ revalidateOnFocus: false, revalidateOnMount: true });

  useEffect(() => {
    if (!draftError) return;
    showErrorToast("下書きの取得に失敗しました");
    void reportUiError(draftError, { message: "Failed to fetch effort draft" });
  }, [draftError]);

  useEffect(() => {
    if (!storageKey || hasInitializedRef.current) return;
    if (draftLoading) return;

    hasInitializedRef.current = true;
    setIsInitializing(true);

    const localDraft: PersistedFormPayload | null = readLocalDraft(storageKey);

    // サーバーに下書きがなく、LocalStorageに下書きがある場合
    // → 別デバイスで登録が完了した可能性が高いため、LocalStorageの古い下書きをクリア
    // ただし、ネットワークエラー時はLocalStorageを保持する
    if (!remoteDraft && localDraft && !draftError) {
      clearLocalDraft(storageKey);
      setFormData(createInitialFormData());
      setIsInitializing(false);
      setCanSyncDraft(true);
      return;
    }

    const remoteSource: DraftSource | null = remoteDraft
      ? {
          formData: {
            date: remoteDraft.date ? new Date(remoteDraft.date) : null,
            memo: remoteDraft.memo ?? "",
            entries: remoteDraft.entries
              .map(mapDraftEntryToFormEntry)
              .map(ensureProjectGroupId),
          },
          timestamp: remoteDraft.client_updated_at ?? null,
        }
      : null;

    const localSource: DraftSource | null = localDraft
      ? {
          formData: {
            date: localDraft.date ? new Date(localDraft.date) : null,
            memo: localDraft.memo ?? "",
            entries: (localDraft.entries ?? []).map(ensureProjectGroupId),
          },
          timestamp: localDraft.clientUpdatedAt ?? null,
        }
      : null;

    const latest: DraftSource | null = pickLatestDraft(
      remoteSource,
      localSource,
    );
    if (latest) {
      setFormData(latest.formData);
    } else {
      setFormData(createInitialFormData());
    }

    setIsInitializing(false);
    setCanSyncDraft(true);
  }, [draftError, draftLoading, remoteDraft, storageKey]);

  useEffect(() => {
    if (!storageKey || !canSyncDraft) return;

    if (skipDraftSyncRef.current) {
      skipDraftSyncRef.current = false;
      return;
    }

    const nextTimestamp: string = new Date().toISOString();

    // フォームが空の場合は保存しない（登録完了後のリセット時など）
    const isEmpty =
      formData.entries.length === 0 &&
      (!formData.memo || formData.memo.trim().length === 0) &&
      !formData.date;

    if (isEmpty) {
      if (storageKey) {
        clearLocalDraft(storageKey);
      }
      return;
    }

    const draftPayload: EffortDraft = {
      date: formatDateOnly(formData.date),
      entries: formData.entries.map(mapFormEntryToRequest),
      memo: formData.memo.trim().length > 0 ? formData.memo : null,
      clientUpdatedAt: nextTimestamp,
    };

    persistLocalDraft(storageKey, {
      date: draftPayload.date,
      entries: formData.entries,
      memo: formData.memo,
      clientUpdatedAt: nextTimestamp,
    });

    if (draftSyncTimeoutRef.current !== null) {
      window.clearTimeout(draftSyncTimeoutRef.current);
    }

    draftSyncTimeoutRef.current = window.setTimeout(() => {
      void saveEffortDraft(draftPayload)
        .then(() => {
          void mutate();
        })
        .catch((error) => {
          showErrorToast("ドラフトの保存に失敗しました。");
          void reportUiError(error, { message: "Failed to save effort draft" });
        });
    }, DRAFT_SYNC_DELAY_MS);

    return () => {
      if (draftSyncTimeoutRef.current !== null) {
        window.clearTimeout(draftSyncTimeoutRef.current);
        draftSyncTimeoutRef.current = null;
      }
    };
  }, [canSyncDraft, formData, mutate, storageKey]);

  const cancelSync = (): void => {
    if (draftSyncTimeoutRef.current !== null) {
      window.clearTimeout(draftSyncTimeoutRef.current);
      draftSyncTimeoutRef.current = null;
    }
  };

  const skipNextDraftSync = (): void => {
    skipDraftSyncRef.current = true;
    cancelSync();
  };

  const clearPersistedDraft = (): void => {
    if (!storageKey) return;
    clearLocalDraft(storageKey);
  };

  return {
    formData,
    setFormData,
    isInitializing,
    skipNextDraftSync,
    cancelSync,
    clearPersistedDraft,
    mutateDraft: mutate,
  };
}

/**
 * ローカルストレージからドラフトを読み込みます。
 *
 * @param key 保存キー
 * @returns 復元したドラフト
 */
function readLocalDraft(key: string): PersistedFormPayload | null {
  if (typeof window === "undefined") return null;
  const raw: string | null = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PersistedFormPayload;
  } catch (error) {
    window.localStorage.removeItem(key);
    void reportUiError(error, {
      message: "ローカルドラフトの読み込みに失敗しました。",
    });
    return null;
  }
}

/**
 * ドラフトをローカルストレージに保存します。
 *
 * @param key 保存キー
 * @param payload 保存する内容
 */
function persistLocalDraft(key: string, payload: PersistedFormPayload): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch (error) {
    void reportUiError(error, {
      message: "ローカルドラフトの保存に失敗しました。",
    });
  }
}

/**
 * ローカルのドラフトを削除します。
 *
 * @param key 対象キー
 */
function clearLocalDraft(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

/**
 * サーバー/ローカルのうち新しいドラフトを選択します。
 *
 * @param server サーバー側ドラフト
 * @param local ローカルドラフト
 * @returns 最新のドラフト
 */
function pickLatestDraft(
  server: DraftSource | null,
  local: DraftSource | null,
): DraftSource | null {
  if (server && local) {
    const serverTime = normalizeTimestamp(server.timestamp);
    const localTime = normalizeTimestamp(local.timestamp);

    if (serverTime === null && localTime === null) {
      return server;
    }
    if (serverTime === null) {
      return local;
    }
    if (localTime === null) {
      return server;
    }
    return serverTime >= localTime ? server : local;
  }
  return server ?? local;
}

function normalizeTimestamp(value?: string | null): number | null {
  if (!value) return null;
  const timestamp: number = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}
