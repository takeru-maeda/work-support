import { useCallback, useMemo } from "react";
import dayjs from "dayjs";

import { reportUiError } from "@/services/logs";
import { useCurrentGoals } from "@/services/goals";
import { showErrorToast } from "@/lib/toast";
import { usePastGoalFilters } from "@/features/goals/hooks/modules/past/usePastGoalFilters";
import { usePastGoalHistory } from "@/features/goals/hooks/modules/past/usePastGoalHistory";
import { usePastGoalsSelection } from "@/features/goals/hooks/modules/past/usePastGoalsSelection";
import type {
  GoalHistoryQuery,
  GoalHistorySortOption,
} from "@shared/schemas/goals";
import type {
  Goal,
  PastGoal,
  SortField,
  SortDirection,
} from "@/features/goals/types";

export interface UsePastGoalsResult {
  goals: PastGoal[];
  selectedGoal: PastGoal | null;
  isContentDialogOpen: boolean;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  itemsPerPage: number;
  isLoading: boolean;
  draftTitle: string;
  setDraftTitle: (value: string) => void;
  draftStartDate: Date | undefined;
  setDraftStartDate: (date: Date | undefined) => void;
  draftEndDate: Date | undefined;
  setDraftEndDate: (date: Date | undefined) => void;
  draftProgressMin: string;
  setDraftProgressMin: (value: string) => void;
  draftProgressMax: string;
  setDraftProgressMax: (value: string) => void;
  sortBy: SortField | null;
  sortDirection: SortDirection;
  handleSort: (field: SortField) => void;
  handleApplyFilters: () => void;
  handleClearFilters: () => void;
  handleViewContent: (goal: PastGoal) => void;
  handleContentDialogOpenChange: (open: boolean) => void;
  handlePageChange: (page: number) => void;
  handlePageSizeChange: (pageSize: number) => void;
}

export const usePastGoals = (): UsePastGoalsResult => {
  const { data: currentGoalsData } = useCurrentGoals();
  const currentGoals: Goal[] = currentGoalsData ?? [];

  const filters = usePastGoalFilters(currentGoals);
  const { goalHistory, isLoading } = usePastGoalHistory({
    query: createGoalHistoryQuery(filters),
    onError: (error) => {
      showErrorToast(
        "過去目標の取得に失敗しました。時間を空けて再度お試しください。",
      );
      void reportUiError(error, {
        message: "Failed to fetch goal history",
        clientContext: {
          page: filters.currentPage,
          pageSize: filters.itemsPerPage,
          sortBy: filters.sortBy,
          sortDirection: filters.sortDirection,
        },
      });
    },
  });

  const latestPeriodEnd: Date | undefined = useMemo(() => {
    if (currentGoals.length === 0) return undefined;
    return currentGoals.reduce<Date>(
      (max, goal) => (goal.endDate > max ? goal.endDate : max),
      currentGoals[0].endDate,
    );
  }, [currentGoals]);

  const filteredHistoryItems = useMemo(() => {
    if (!goalHistory) return [];
    if (!latestPeriodEnd) return goalHistory.items;
    return goalHistory.items.filter(
      (item) => new Date(item.end_date) < latestPeriodEnd,
    );
  }, [goalHistory, latestPeriodEnd]);

  const goals: PastGoal[] = useMemo(
    () => filteredHistoryItems.map(mapGoalHistoryItemToPastGoal),
    [filteredHistoryItems],
  );

  const totalCount: number = useMemo(() => {
    if (!goalHistory) return 0;
    const removedCount = goalHistory.items.length - filteredHistoryItems.length;
    return Math.max(0, goalHistory.meta.total - removedCount);
  }, [filteredHistoryItems, goalHistory]);

  const totalPages: number = useMemo(
    () => (totalCount === 0 ? 0 : Math.ceil(totalCount / filters.itemsPerPage)),
    [filters.itemsPerPage, totalCount],
  );

  const {
    selectedGoal,
    isContentDialogOpen,
    handleViewContent,
    handleContentDialogOpenChange,
  } = usePastGoalsSelection();

  const handleSort = useCallback(
    (field: SortField) => {
      if (filters.sortBy === field) {
        if (filters.sortDirection === "asc") {
          filters.setSortDirection("desc");
        } else if (filters.sortDirection === "desc") {
          filters.setSortBy(null);
          filters.setSortDirection(null);
        } else {
          filters.setSortDirection("asc");
        }
      } else {
        filters.setSortBy(field);
        filters.setSortDirection("asc");
      }
      filters.setCurrentPage(1);
    },
    [filters],
  );

  return {
    goals,
    selectedGoal,
    isContentDialogOpen,
    currentPage: filters.currentPage,
    totalPages,
    totalCount,
    itemsPerPage: filters.itemsPerPage,
    isLoading,
    draftTitle: filters.draftTitle,
    setDraftTitle: filters.setDraftTitle,
    draftStartDate: filters.draftStartDate,
    setDraftStartDate: filters.setDraftStartDate,
    draftEndDate: filters.draftEndDate,
    setDraftEndDate: filters.setDraftEndDate,
    draftProgressMin: filters.draftProgressMin,
    setDraftProgressMin: filters.setDraftProgressMin,
    draftProgressMax: filters.draftProgressMax,
    setDraftProgressMax: filters.setDraftProgressMax,
    sortBy: filters.sortBy,
    sortDirection: filters.sortDirection,
    handleSort,
    handleApplyFilters: filters.applyDraftFilters,
    handleClearFilters: filters.clearFilters,
    handleViewContent,
    handleContentDialogOpenChange,
    handlePageChange: filters.setCurrentPage,
    handlePageSizeChange: (pageSize: number) => {
      filters.setItemsPerPage(pageSize);
      filters.setCurrentPage(1);
    },
  };
};

function createGoalHistoryQuery(
  filters: ReturnType<typeof usePastGoalFilters>,
): GoalHistoryQuery | null {
  if (!filters.filtersInitialized) return null;

  const base: GoalHistoryQuery = {
    page: filters.currentPage,
    pageSize: filters.itemsPerPage,
  };

  if (filters.appliedFilters.query) base.query = filters.appliedFilters.query;
  if (filters.appliedFilters.startDate)
    base.startDate = filters.appliedFilters.startDate;
  if (filters.appliedFilters.endDate)
    base.endDate = filters.appliedFilters.endDate;
  if (filters.appliedFilters.minProgress !== undefined) {
    base.minProgress = filters.appliedFilters.minProgress;
  }
  if (filters.appliedFilters.maxProgress !== undefined) {
    base.maxProgress = filters.appliedFilters.maxProgress;
  }
  const sort = mapSortFieldToApi(filters.sortBy, filters.sortDirection);
  if (sort) {
    base.sort = sort;
  }

  return base;
}

function mapSortFieldToApi(
  field: SortField | null,
  direction: SortDirection,
): GoalHistorySortOption | undefined {
  if (!field || !direction) return undefined;

  const baseFieldMap: Record<
    SortField,
    "title" | "weight" | "progress" | "start_date"
  > = {
    name: "title",
    weight: "weight",
    progress: "progress",
    period: "start_date",
  };

  const baseField = baseFieldMap[field];
  if (!baseField) return undefined;

  const prefix = direction === "desc" ? "-" : "";
  return `${prefix}${baseField}` as GoalHistorySortOption;
}

function mapGoalHistoryItemToPastGoal({
  id,
  title,
  weight,
  progress,
  content,
  start_date,
  end_date,
}: {
  id: number;
  title: string;
  weight: number;
  progress: number;
  content: string | null;
  start_date: string;
  end_date: string;
}): PastGoal {
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);

  return {
    id,
    name: title,
    weight,
    progress,
    content: content ?? null,
    startDate,
    endDate,
    period: `${dayjs(startDate).format("YYYY/MM/DD")} - ${dayjs(endDate).format("YYYY/MM/DD")}`,
  };
}
