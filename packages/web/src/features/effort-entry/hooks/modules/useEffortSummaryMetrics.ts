import { useMemo } from "react";

import type {
  EffortEntry,
  EffortProjectOption,
  ProjectBreakdownItem,
} from "@/features/effort-entry/types";

/**
 * 工数エントリから案件別および全体の集計値を算出します。
 *
 * @param entries 集計対象の工数エントリ
 * @returns 案件別内訳と合計値
 */
export const useEffortSummaryMetrics = (
  entries: EffortEntry[],
  projectOptions: EffortProjectOption[],
): {
  projectBreakdown: ProjectBreakdownItem[];
  totalEstimated: number;
  totalActual: number;
  hasTotalEstimated: boolean;
  totalDifference: number;
} => {
  const projectBreakdown = useMemo<ProjectBreakdownItem[]>(() => {
    interface ProjectAccumulator extends ProjectBreakdownItem {
      actualWithEstimate: number;
    }

    const breakdown = new Map<string, ProjectAccumulator>();
    const projectNameById = new Map<number, string>();
    for (const option of projectOptions) {
      if (option.id !== null) {
        projectNameById.set(option.id, option.name);
      }
    }

    for (const entry of entries) {
      const resolvedName: string =
        entry.projectName.trim() ||
        (entry.projectId !== null
          ? (projectNameById.get(entry.projectId) ?? "")
          : "");
      const name: string = resolvedName || "未設定の案件";
      const key: string = `${entry.projectId ?? "null"}::${name.toLowerCase()}`;
      const current: ProjectAccumulator = breakdown.get(key) ?? {
        projectId: entry.projectId,
        projectName: name,
        estimated: 0,
        actual: 0,
        difference: 0,
        hasEstimated: false,
        actualWithEstimate: 0,
      };

      const actualHours: number = entry.actualHours ?? 0;
      current.actual += actualHours;

      if (entry.estimatedHours !== null) {
        current.hasEstimated = true;
        current.estimated += entry.estimatedHours;
        current.actualWithEstimate += actualHours;
      }

      breakdown.set(key, current);
    }

    return Array.from(breakdown.values()).map((project) => ({
      ...project,
      difference: project.actualWithEstimate - project.estimated,
    }));
  }, [entries]);

  const totalEstimated: number = useMemo(
    () =>
      entries.reduce((sum, entry) => {
        if (entry.estimatedHours === null) return sum;
        return sum + entry.estimatedHours;
      }, 0),
    [entries],
  );

  const totalActual: number = useMemo(
    () => entries.reduce((sum, entry) => sum + (entry.actualHours ?? 0), 0),
    [entries],
  );

  const totalActualWithEstimate: number = useMemo(
    () =>
      entries.reduce((sum, entry) => {
        if (entry.estimatedHours === null) return sum;
        return sum + (entry.actualHours ?? 0);
      }, 0),
    [entries],
  );

  const hasTotalEstimated: boolean = useMemo(
    () => entries.some((entry) => entry.estimatedHours !== null),
    [entries],
  );

  const totalDifference: number = useMemo(() => {
    if (!hasTotalEstimated) return 0;
    return totalActualWithEstimate - totalEstimated;
  }, [hasTotalEstimated, totalActualWithEstimate, totalEstimated]);

  return {
    projectBreakdown,
    totalEstimated,
    totalActual,
    hasTotalEstimated,
    totalDifference,
  };
};
