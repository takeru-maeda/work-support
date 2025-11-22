import type {
  EffortEntry,
  EffortEntryError,
} from "@/features/effort-entry/types";

/**
 * 案件グループに紐づくエントリの中から最初に見つかったプロジェクトエラーを返します。
 *
 * @param entries グループに属するエントリ一覧
 * @param entryErrors エントリIDをキーとしたエラーマップ
 * @returns プロジェクトエラーのメッセージ
 */
export const projectErrorMessage = (
  entries: EffortEntry[],
  entryErrors: Record<string, EffortEntryError | undefined>,
): string | undefined => {
  for (const entry of entries) {
    const message: string | undefined = entryErrors[entry.id]?.project;
    if (message) {
      return message;
    }
  }
  return undefined;
};
