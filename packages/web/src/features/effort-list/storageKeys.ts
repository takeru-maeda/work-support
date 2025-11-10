import { buildUserScopedKey } from "@/lib/utils";

const EFFORT_LIST_FILTER_STORAGE_BASE_KEY = "efforts:list:filters";

/**
 * 工数一覧のフィルター条件を保存する際のキーを取得します。
 *
 * @returns ユーザーID付きのローカルストレージキー
 */
export const getEffortListFilterStorageKey = (): string =>
  buildUserScopedKey(EFFORT_LIST_FILTER_STORAGE_BASE_KEY);
