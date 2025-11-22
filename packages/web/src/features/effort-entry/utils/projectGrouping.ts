import type { EffortEntry } from "@/features/effort-entry/types";

/**
 * 案件グループを一意に識別するキーを生成します。
 *
 * @param entry グループ化対象エントリ
 * @returns グループキー
 */
export const getProjectGroupKey = (entry: EffortEntry): string => {
  if (entry.projectId !== null) {
    return `project:${entry.projectId}`;
  }
  if (entry.projectGroupId) {
    return `group:${entry.projectGroupId}`;
  }
  if (entry.projectName.trim().length > 0) {
    return `name:${entry.projectName.trim().toLowerCase()}`;
  }
  return `entry:${entry.id}`;
};
