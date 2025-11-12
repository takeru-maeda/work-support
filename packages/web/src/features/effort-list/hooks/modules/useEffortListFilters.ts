import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";

import { getEffortListFilterStorageKey } from "@/features/effort-list/storageKeys";
import type {
  EffortSortColumn,
  EffortSortDirection,
} from "@/features/effort-list/types";

export const ALL_OPTION = "__all__";
const DEFAULT_SORT_COLUMN: EffortSortColumn = "date";
const DEFAULT_SORT_DIRECTION: EffortSortDirection = "desc";
const DEFAULT_ITEMS_PER_PAGE = 10;

interface StoredEffortFilters {
  date?: string | null;
  projectId?: number | null;
  taskId?: number | null;
  sortColumn?: EffortSortColumn | null;
  sortDirection?: EffortSortDirection;
  itemsPerPage?: number;
}

export interface EffortListFiltersState {
  tempFilterDate?: Date;
  setTempFilterDate: (date: Date | undefined) => void;
  tempFilterProject?: string;
  setTempFilterProject: (value: string | undefined) => void;
  tempFilterTask?: string;
  setTempFilterTask: (value: string | undefined) => void;
  filterDate?: Date;
  filterProject?: number;
  filterTask?: number;
  sortColumn: EffortSortColumn | null;
  sortDirection: EffortSortDirection;
  handleSort: (column: EffortSortColumn) => void;
  applyFilters: () => void;
  clearFilters: () => void;
  filtersInitialized: boolean;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage: number;
  setItemsPerPage: (value: number) => void;
}

export const useEffortListFilters = (): EffortListFiltersState => {
  const storageKey: string = getEffortListFilterStorageKey();
  const [filtersInitialized, setFiltersInitialized] = useState<boolean>(false);

  const [filterDate, setFilterDate] = useState<Date | undefined>();
  const [filterProject, setFilterProject] = useState<number | undefined>(
    undefined,
  );
  const [filterTask, setFilterTask] = useState<number | undefined>();

  const [tempFilterDate, setTempFilterDate] = useState<Date | undefined>();
  const [tempFilterProject, setTempFilterProject] = useState<
    string | undefined
  >(undefined);
  const [tempFilterTask, setTempFilterTask] = useState<string | undefined>(
    undefined,
  );

  const [sortColumn, setSortColumn] = useState<EffortSortColumn | null>(
    DEFAULT_SORT_COLUMN,
  );
  const [sortDirection, setSortDirection] = useState<EffortSortDirection>(
    DEFAULT_SORT_DIRECTION,
  );

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(
    DEFAULT_ITEMS_PER_PAGE,
  );

  useEffect(() => {
    if (filtersInitialized) return;
    if (typeof window === "undefined") {
      setFiltersInitialized(true);
      return;
    }

    const raw: string | null = window.localStorage.getItem(storageKey);
    if (!raw) {
      setFiltersInitialized(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as StoredEffortFilters;
      const date: Date | undefined = parsed.date
        ? new Date(parsed.date)
        : undefined;
      setFilterDate(date);
      setTempFilterDate(date);

      const projectId: number | undefined =
        typeof parsed.projectId === "number" ? parsed.projectId : undefined;
      setFilterProject(projectId);
      setTempFilterProject(
        projectId === undefined ? undefined : String(projectId),
      );

      const taskId: number | undefined =
        typeof parsed.taskId === "number" ? parsed.taskId : undefined;
      setFilterTask(taskId);
      setTempFilterTask(taskId === undefined ? undefined : String(taskId));

      setSortColumn(parsed.sortColumn ?? DEFAULT_SORT_COLUMN);
      setSortDirection(parsed.sortDirection ?? DEFAULT_SORT_DIRECTION);
      setItemsPerPage(parsed.itemsPerPage ?? DEFAULT_ITEMS_PER_PAGE);
    } catch {
      // ignore corrupted storage
    } finally {
      setFiltersInitialized(true);
    }
  }, [filtersInitialized, storageKey]);

  useEffect(() => {
    if (!filtersInitialized || typeof window === "undefined") return;

    const stored: StoredEffortFilters = {
      date: filterDate ? dayjs(filterDate).format("YYYY-MM-DD") : null,
      projectId: filterProject ?? null,
      taskId: filterTask ?? null,
      sortColumn,
      sortDirection,
      itemsPerPage,
    };

    window.localStorage.setItem(storageKey, JSON.stringify(stored));
  }, [
    filterDate,
    filterProject,
    filterTask,
    filtersInitialized,
    itemsPerPage,
    sortColumn,
    sortDirection,
    storageKey,
  ]);

  const applyFilters = useCallback(() => {
    const toId = (value?: string): number | undefined => {
      if (!value || value === ALL_OPTION) return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    setFilterDate(tempFilterDate);
    setFilterProject(toId(tempFilterProject));
    setFilterTask(toId(tempFilterTask));
    setCurrentPage(1);
  }, [tempFilterDate, tempFilterProject, tempFilterTask]);

  const clearFilters = useCallback(() => {
    setTempFilterDate(undefined);
    setTempFilterProject(undefined);
    setTempFilterTask(undefined);
    setFilterDate(undefined);
    setFilterProject(undefined);
    setFilterTask(undefined);
    setSortColumn(DEFAULT_SORT_COLUMN);
    setSortDirection(DEFAULT_SORT_DIRECTION);
    setItemsPerPage(DEFAULT_ITEMS_PER_PAGE);
    setCurrentPage(1);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const handleSort = useCallback(
    (column: EffortSortColumn) => {
      if (sortColumn === column) {
        if (sortDirection === "asc") {
          setSortDirection("desc");
        } else if (sortDirection === "desc") {
          setSortColumn(null);
          setSortDirection(null);
        } else {
          setSortDirection("asc");
        }
      } else {
        setSortColumn(column);
        setSortDirection("asc");
      }
      setCurrentPage(1);
    },
    [sortColumn, sortDirection],
  );

  return {
    tempFilterDate,
    setTempFilterDate,
    tempFilterProject,
    setTempFilterProject,
    tempFilterTask,
    setTempFilterTask,
    filterDate,
    filterProject,
    filterTask,
    sortColumn,
    sortDirection,
    handleSort,
    applyFilters,
    clearFilters,
    filtersInitialized,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
  };
};
