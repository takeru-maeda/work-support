import { buildUserScopedKey } from "@/lib/utils";

const GOAL_ADD_DRAFT_STORAGE_BASE_KEY = "goals:add:draft";
const PAST_GOALS_FILTER_STORAGE_BASE_KEY = "goals:past:filters";

/**
 * 目標追加ドラフトを保存するローカルストレージキーを取得します。
 *
 * @returns ユーザーID込みのキー
 */
export const getGoalAddDraftStorageKey = (): string =>
  buildUserScopedKey(GOAL_ADD_DRAFT_STORAGE_BASE_KEY);

/**
 * 過去目標フィルターを保存するローカルストレージキーを取得します。
 *
 * @returns ユーザーID込みのキー
 */
export const getPastGoalsFilterStorageKey = (): string =>
  buildUserScopedKey(PAST_GOALS_FILTER_STORAGE_BASE_KEY);
