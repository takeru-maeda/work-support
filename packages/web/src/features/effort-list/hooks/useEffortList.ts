import { useEffect, useMemo } from "react";
import { format } from "date-fns";

import { showErrorToast } from "@/lib/toast";
import { reportUiError } from "@/services/logs";
import {
  useEffortListFilters,
  ALL_OPTION,
  type EffortListFiltersState,
} from "@/features/effort-list/hooks/modules/useEffortListFilters";
import { useEffortListData } from "@/features/effort-list/hooks/modules/useEffortListData";
import { useEffortListProjects } from "@/features/effort-list/hooks/modules/useEffortListProjects";
import type {
  EffortListEntry,
  EffortSortColumn,
  EffortSortDirection,
} from "@/features/effort-list/types";
import type {
  WorkRecordListQuery,
  WorkRecordSort,
} from "@shared/schemas/workRecords";

const SORT_COLUMN_MAP: Record<EffortSortColumn, string> = {
  date: "date",
  project: "project",
  task: "task",
  estimatedHours: "estimated_hours",
  actualHours: "hours",
  difference: "diff",
};

/**
 * 工数一覧テーブルの状態とフィルタ操作を提供します。
 *
 * @returns フィルタ入力値・テーブルデータ・操作ハンドラ一式
 */
export function useEffortList() {
  const filters: EffortListFiltersState = useEffortListFilters();

  const query: WorkRecordListQuery | null = useMemo(() => {
    if (!filters.filtersInitialized) return null;

    return {
      date: filters.filterDate
        ? format(filters.filterDate, "yyyy-MM-dd")
        : undefined,
      projectId: filters.filterProject,
      taskId: filters.filterTask,
      sort: mapSortToApi(filters.sortColumn, filters.sortDirection),
      page: filters.currentPage,
      pageSize: filters.itemsPerPage,
    };
  }, [
    filters.currentPage,
    filters.filterDate,
    filters.filterProject,
    filters.filterTask,
    filters.filtersInitialized,
    filters.itemsPerPage,
    filters.sortColumn,
    filters.sortDirection,
  ]);

  const { data, error, isLoading } = useEffortListData(query);

  useEffect(() => {
    if (!error) return;
    showErrorToast("工数データの取得に失敗しました");
    void reportUiError(error, { message: "Failed to fetch work records" });
  }, [error]);

  const entries: EffortListEntry[] = useMemo(() => {
    if (!data?.items) return [];
    return data.items.map(mapWorkRecordToEntry);
  }, [data?.items]);

  const parsedProjectId: number | undefined =
    filters.tempFilterProject &&
    filters.tempFilterProject !== ALL_OPTION &&
    !Number.isNaN(Number(filters.tempFilterProject))
      ? Number(filters.tempFilterProject)
      : undefined;

  const { projectOptions, taskOptions, isLoading: isProjectLoading } =
    useEffortListProjects(parsedProjectId);

  const totalPages: number = data?.meta.totalPages ?? 1;
  const totalCount: number = data?.meta.total ?? entries.length;

  useEffect(() => {
    if (!filters.filtersInitialized) return;
    if (filters.currentPage > totalPages) {
      filters.setCurrentPage(Math.max(totalPages, 1));
    }
  }, [
    filters.currentPage,
    filters.filtersInitialized,
    filters.setCurrentPage,
    totalPages,
  ]);

  const handleItemsPerPageChange = (value: number) => {
    filters.setItemsPerPage(value);
    filters.setCurrentPage(1);
  };

  const hasActiveFilters: boolean =
    Boolean(filters.filterDate) ||
    filters.filterProject !== undefined ||
    filters.filterTask !== undefined;

  return {
    tempFilterDate: filters.tempFilterDate,
    setTempFilterDate: filters.setTempFilterDate,
    tempFilterProject: filters.tempFilterProject,
    setTempFilterProject: filters.setTempFilterProject,
    tempFilterTask: filters.tempFilterTask,
    setTempFilterTask: filters.setTempFilterTask,
    projectOptions,
    taskOptions,
    isProjectOptionsLoading: isProjectLoading,
    applyFilters: filters.applyFilters,
    clearFilters: filters.clearFilters,
    ALL_OPTION,
    sortColumn: filters.sortColumn,
    sortDirection: filters.sortDirection,
    handleSort: filters.handleSort,
    currentEntries: entries,
    isLoading,
    currentPage: filters.currentPage,
    setCurrentPage: filters.setCurrentPage,
    totalPages,
    totalCount,
    itemsPerPage: filters.itemsPerPage,
    handleItemsPerPageChange,
    hasActiveFilters,
  };
}

/**
 * 画面上のソート指定を API クエリ形式へ変換します。
 *
 * @param column UI で選択されたソート対象
 * @param direction 昇順/降順
 * @returns API に送信するソートキー
 */
function mapSortToApi(
  column: EffortSortColumn | null,
  direction: EffortSortDirection,
): WorkRecordSort {
  if (!column || !direction) {
    return "-date";
  }
  const apiField: string = SORT_COLUMN_MAP[column];
  if (!apiField) {
    return "-date";
  }
  return `${direction === "desc" ? "-" : ""}${apiField}` as WorkRecordSort;
}

/**
 * API レスポンスのワークレコードを一覧用の表示データへ成形します。
 *
 * @param record API から取得した工数レコード
 * @returns テーブル表示用エントリ
 */
function mapWorkRecordToEntry(record: {
  id: number;
  date: string;
  project: string;
  project_id: number;
  task: string;
  task_id: number;
  estimated_hours: number | null;
  hours: number;
  diff: number | null;
}): EffortListEntry {
  return {
    id: String(record.id),
    date: record.date,
    project: record.project,
    projectId: record.project_id,
    task: record.task,
    taskId: record.task_id,
    estimatedHours: record.estimated_hours,
    actualHours: record.hours,
    difference: record.diff,
  };
}
