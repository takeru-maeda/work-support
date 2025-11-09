import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";

import { getPastGoalsFilterStorageKey } from "@/features/goals/storageKeys";
import type { SortField, SortDirection, Goal } from "@/features/goals/types";

const DEFAULT_PAGE_SIZE = 10;

interface StoredPastGoalFilters {
  query?: string;
  startDate?: string | null;
  endDate?: string | null;
  minProgress?: number | null;
  maxProgress?: number | null;
  sortBy?: SortField | null;
  sortDirection?: SortDirection;
  pageSize?: number;
}

export interface PastGoalFilters {
  filterTitle: string;
  draftTitle: string;
  setDraftTitle: (value: string) => void;
  filterStartDate: Date | undefined;
  draftStartDate: Date | undefined;
  setDraftStartDate: (date: Date | undefined) => void;
  filterEndDate: Date | undefined;
  draftEndDate: Date | undefined;
  setDraftEndDate: (date: Date | undefined) => void;
  filterProgressMin?: number;
  draftProgressMin: string;
  setDraftProgressMin: (value: string) => void;
  filterProgressMax?: number;
  draftProgressMax: string;
  setDraftProgressMax: (value: string) => void;
  sortBy: SortField | null;
  setSortBy: (field: SortField | null) => void;
  sortDirection: SortDirection;
  setSortDirection: (dir: SortDirection) => void;
  itemsPerPage: number;
  setItemsPerPage: (value: number) => void;
  currentPage: number;
  setCurrentPage: (value: number) => void;
  filtersInitialized: boolean;
  applyDraftFilters: () => void;
  clearFilters: () => void;
  appliedFilters: {
    query?: string;
    startDate?: string;
    endDate?: string;
    minProgress?: number;
    maxProgress?: number;
    sortBy: SortField | null;
    sortDirection: SortDirection;
  };
}

export const usePastGoalFilters = (currentGoals: Goal[]): PastGoalFilters => {
  const storageKey: string = getPastGoalsFilterStorageKey();
  const [filterTitle, setFilterTitle] = useState<string>("");
  const [draftTitle, setDraftTitle] = useState<string>("");
  const [filterStartDate, setFilterStartDate] = useState<Date | undefined>(
    undefined,
  );
  const [draftStartDate, setDraftStartDate] = useState<Date | undefined>(
    undefined,
  );
  const [filterEndDate, setFilterEndDate] = useState<Date | undefined>(
    undefined,
  );
  const [draftEndDate, setDraftEndDate] = useState<Date | undefined>(undefined);
  const [filterProgressMin, setFilterProgressMin] = useState<
    number | undefined
  >(undefined);
  const [draftProgressMin, setDraftProgressMin] = useState<string>("");
  const [filterProgressMax, setFilterProgressMax] = useState<
    number | undefined
  >(undefined);
  const [draftProgressMax, setDraftProgressMax] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [itemsPerPage, setItemsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filtersInitialized, setFiltersInitialized] = useState<boolean>(false);

  useEffect(() => {
    if (filtersInitialized) return;
    if (typeof window === "undefined") {
      setFiltersInitialized(true);
      return;
    }
    try {
      const raw: string | null = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredPastGoalFilters;

      const query: string = parsed.query ?? "";
      setFilterTitle(query);
      setDraftTitle(query);

      const start: Date | undefined = parsed.startDate
        ? new Date(parsed.startDate)
        : undefined;
      setFilterStartDate(start);
      setDraftStartDate(start);

      const end: Date | undefined = parsed.endDate
        ? new Date(parsed.endDate)
        : undefined;
      setFilterEndDate(end);
      setDraftEndDate(end);

      const min: number | undefined = parsed.minProgress ?? undefined;
      setFilterProgressMin(min);
      setDraftProgressMin(typeof min === "number" ? min.toString() : "");

      const max: number | undefined = parsed.maxProgress ?? undefined;
      setFilterProgressMax(max);
      setDraftProgressMax(typeof max === "number" ? max.toString() : "");

      if (parsed.pageSize) {
        setItemsPerPage(parsed.pageSize);
      }

      setSortBy(parsed.sortBy ?? null);
      setSortDirection(parsed.sortDirection ?? null);
    } catch {
      // 無視
    } finally {
      setFiltersInitialized(true);
    }
  }, [filtersInitialized]);

  const appliedFilters = useMemo(() => {
    const startDate: string | undefined = filterStartDate
      ? dayjs(filterStartDate).format("YYYY-MM-DD")
      : undefined;
    const endDate: string | undefined = (() => {
      if (filterEndDate) {
        return dayjs(filterEndDate).format("YYYY-MM-DD");
      }
      if (currentGoals.length === 0) return undefined;
      const latestPeriodStart: Date = currentGoals.reduce<Date>(
        (min, goal) => (goal.startDate < min ? goal.startDate : min),
        currentGoals[0].startDate,
      );
      return dayjs(latestPeriodStart).subtract(1, "day").format("YYYY-MM-DD");
    })();

    return {
      query: filterTitle.trim() || undefined,
      startDate,
      endDate,
      minProgress: filterProgressMin,
      maxProgress: filterProgressMax,
      sortBy,
      sortDirection,
    };
  }, [
    currentGoals,
    filterEndDate,
    filterProgressMax,
    filterProgressMin,
    filterStartDate,
    filterTitle,
    sortBy,
    sortDirection,
  ]);

  const applyDraftFilters = useCallback(() => {
    const nextMin =
      draftProgressMin.trim() === ""
        ? undefined
        : Number.parseInt(draftProgressMin, 10);
    const nextMax =
      draftProgressMax.trim() === ""
        ? undefined
        : Number.parseInt(draftProgressMax, 10);

    setFilterTitle(draftTitle);
    setFilterStartDate(draftStartDate);
    setFilterEndDate(draftEndDate);
    setFilterProgressMin(
      Number.isFinite(nextMin) ? (nextMin as number) : undefined,
    );
    setFilterProgressMax(
      Number.isFinite(nextMax) ? (nextMax as number) : undefined,
    );
    setCurrentPage(1);
  }, [
    draftEndDate,
    draftProgressMax,
    draftProgressMin,
    draftStartDate,
    draftTitle,
  ]);

  const clearFilters = useCallback(() => {
    setDraftTitle("");
    setDraftStartDate(undefined);
    setDraftEndDate(undefined);
    setDraftProgressMin("");
    setDraftProgressMax("");

    setFilterTitle("");
    setFilterStartDate(undefined);
    setFilterEndDate(undefined);
    setFilterProgressMin(undefined);
    setFilterProgressMax(undefined);
    setSortBy(null);
    setSortDirection(null);
    setCurrentPage(1);
    setItemsPerPage(DEFAULT_PAGE_SIZE);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!filtersInitialized) return;
    const stored: StoredPastGoalFilters = {
      query: filterTitle.trim() || undefined,
      startDate: filterStartDate
        ? dayjs(filterStartDate).format("YYYY-MM-DD")
        : null,
      endDate: filterEndDate ? dayjs(filterEndDate).format("YYYY-MM-DD") : null,
      minProgress: filterProgressMin ?? null,
      maxProgress: filterProgressMax ?? null,
      sortBy,
      sortDirection,
      pageSize: itemsPerPage,
    };
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(stored));
    }
  }, [
    filterEndDate,
    filterProgressMax,
    filterProgressMin,
    filterStartDate,
    filterTitle,
    filtersInitialized,
    itemsPerPage,
    sortBy,
    sortDirection,
    storageKey,
  ]);

  return {
    filterTitle,
    draftTitle,
    setDraftTitle,
    filterStartDate,
    draftStartDate,
    setDraftStartDate,
    filterEndDate,
    draftEndDate,
    setDraftEndDate,
    filterProgressMin,
    draftProgressMin,
    setDraftProgressMin,
    filterProgressMax,
    draftProgressMax,
    setDraftProgressMax,
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    itemsPerPage,
    setItemsPerPage,
    currentPage,
    setCurrentPage,
    filtersInitialized,
    applyDraftFilters,
    clearFilters,
    appliedFilters,
  };
};
