import { useEffect, useMemo, useState } from "react";
import { useTableResize } from "@/hooks/useTableResize";
import type {
  EffortListEntry,
  EffortSortColumn,
  EffortSortDirection,
} from "@/features/effort-list/types";

const MOCK_ENTRIES: EffortListEntry[] = [
  {
    id: "1",
    date: "2025-01-15",
    project: "プロジェクトA",
    task: "要件定義",
    estimatedHours: 4,
    actualHours: 5,
  },
  {
    id: "2",
    date: "2025-01-15",
    project: "プロジェクトB",
    task: "実装",
    estimatedHours: 6,
    actualHours: 5.5,
  },
  {
    id: "3",
    date: "2025-01-16",
    project: "プロジェクトA",
    task: "設計",
    estimatedHours: 3,
    actualHours: 4,
  },
  {
    id: "4",
    date: "2025-01-16",
    project: "プロジェクトC",
    task: "レビュー",
    estimatedHours: 2,
    actualHours: 1.5,
  },
  {
    id: "5",
    date: "2025-01-17",
    project: "プロジェクトA",
    task: "実装",
    estimatedHours: 8,
    actualHours: 7.5,
  },
  {
    id: "6",
    date: "2025-01-17",
    project: "プロジェクトB",
    task: "テスト",
    estimatedHours: 5,
    actualHours: 6,
  },
  {
    id: "7",
    date: "2025-01-18",
    project: "プロジェクトC",
    task: "要件定義",
    estimatedHours: 3,
    actualHours: 2.5,
  },
  {
    id: "8",
    date: "2025-01-18",
    project: "プロジェクトD",
    task: "設計",
    estimatedHours: 4,
    actualHours: 4.5,
  },
  {
    id: "9",
    date: "2025-01-19",
    project: "プロジェクトA",
    task: "レビュー",
    estimatedHours: 2,
    actualHours: 2.5,
  },
  {
    id: "10",
    date: "2025-01-19",
    project: "プロジェクトB",
    task: "実装",
    estimatedHours: 7,
    actualHours: 6.5,
  },
  {
    id: "11",
    date: "2025-01-20",
    project: "プロジェクトC",
    task: "テスト",
    estimatedHours: 4,
    actualHours: 3.5,
  },
  {
    id: "12",
    date: "2025-01-20",
    project: "プロジェクトD",
    task: "要件定義",
    estimatedHours: 3,
    actualHours: 3,
  },
  {
    id: "13",
    date: "2025-01-21",
    project: "プロジェクトA",
    task: "テスト",
    estimatedHours: 4,
    actualHours: 4.5,
  },
  {
    id: "14",
    date: "2025-01-21",
    project: "プロジェクトD",
    task: "設計",
    estimatedHours: 5,
    actualHours: 5,
  },
  {
    id: "15",
    date: "2025-01-22",
    project: "プロジェクトB",
    task: "要件定義",
    estimatedHours: 3,
    actualHours: 3.5,
  },
  {
    id: "16",
    date: "2025-01-22",
    project: "プロジェクトC",
    task: "実装",
    estimatedHours: 7,
    actualHours: 6.5,
  },
  {
    id: "17",
    date: "2025-01-23",
    project: "プロジェクトA",
    task: "レビュー",
    estimatedHours: 2,
    actualHours: 2,
  },
  {
    id: "18",
    date: "2025-01-23",
    project: "プロジェクトD",
    task: "実装",
    estimatedHours: 6,
    actualHours: 7,
  },
  {
    id: "19",
    date: "2025-01-24",
    project: "プロジェクトB",
    task: "テスト",
    estimatedHours: 4,
    actualHours: 3.5,
  },
  {
    id: "20",
    date: "2025-01-24",
    project: "プロジェクトC",
    task: "設計",
    estimatedHours: 3,
    actualHours: 4,
  },
  {
    id: "21",
    date: "2025-01-25",
    project: "プロジェクトA",
    task: "実装",
    estimatedHours: 8,
    actualHours: 7.5,
  },
  {
    id: "22",
    date: "2025-01-25",
    project: "プロジェクトD",
    task: "テスト",
    estimatedHours: 5,
    actualHours: 5.5,
  },
  {
    id: "23",
    date: "2025-01-26",
    project: "プロジェクトB",
    task: "レビュー",
    estimatedHours: 2,
    actualHours: 1.5,
  },
  {
    id: "24",
    date: "2025-01-26",
    project: "プロジェクトC",
    task: "要件定義",
    estimatedHours: 4,
    actualHours: 4.5,
  },
  {
    id: "25",
    date: "2025-01-27",
    project: "プロジェクトA",
    task: "テスト",
    estimatedHours: 5,
    actualHours: 5,
  },
  {
    id: "26",
    date: "2025-01-27",
    project: "プロジェクトD",
    task: "レビュー",
    estimatedHours: 3,
    actualHours: 3,
  },
  {
    id: "27",
    date: "2025-01-28",
    project: "プロジェクトB",
    task: "設計",
    estimatedHours: 4,
    actualHours: 4.5,
  },
  {
    id: "28",
    date: "2025-01-28",
    project: "プロジェクトC",
    task: "実装",
    estimatedHours: 6,
    actualHours: 5.5,
  },
  {
    id: "29",
    date: "2025-01-29",
    project: "プロジェクトA",
    task: "レビュー",
    estimatedHours: 2,
    actualHours: 2.5,
  },
  {
    id: "30",
    date: "2025-01-29",
    project: "プロジェクトD",
    task: "実装",
    estimatedHours: 7,
    actualHours: 6.5,
  },
];

const ALL_OPTION = "__all__";

export function useEffortList() {
  const [entries] = useState<EffortListEntry[]>(MOCK_ENTRIES);
  const [filteredEntries, setFilteredEntries] =
    useState<EffortListEntry[]>(MOCK_ENTRIES);

  const [tempFilterDate, setTempFilterDate] = useState<Date | undefined>();
  const [tempFilterProject, setTempFilterProject] = useState<
    string | undefined
  >();
  const [tempFilterTask, setTempFilterTask] = useState<string | undefined>();

  const [filterDate, setFilterDate] = useState<Date | undefined>();
  const [filterProject, setFilterProject] = useState<string | undefined>();
  const [filterTask, setFilterTask] = useState<string | undefined>();

  const [sortColumn, setSortColumn] = useState<EffortSortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<EffortSortDirection>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const { tableHeight, isResizing, handleResizeStart } = useTableResize({
    initialHeight: 300,
    minHeight: 300,
    maxHeight: 1000,
  });

  const projectOptions = useMemo(
    () =>
      Array.from(new Set(entries.map((entry) => entry.project))).filter(
        Boolean,
      ),
    [entries],
  );

  const taskOptions = useMemo(
    () =>
      Array.from(new Set(entries.map((entry) => entry.task))).filter(Boolean),
    [entries],
  );

  useEffect(() => {
    let filtered = [...entries];

    if (filterDate) {
      const targetDate = filterDate.toISOString().split("T")[0];
      filtered = filtered.filter((entry) => entry.date === targetDate);
    }

    if (filterProject) {
      filtered = filtered.filter((entry) => entry.project === filterProject);
    }

    if (filterTask) {
      filtered = filtered.filter((entry) => entry.task === filterTask);
    }

    setFilteredEntries(filtered);
    setCurrentPage(1);
  }, [entries, filterDate, filterProject, filterTask]);

  const sortedEntries = useMemo(() => {
    if (!sortColumn || !sortDirection) {
      return [...filteredEntries];
    }

    return [...filteredEntries].sort((a, b) => {
      const resolveValue = (entry: EffortListEntry) => {
        if (sortColumn === "difference") {
          return entry.actualHours - entry.estimatedHours;
        }
        return entry[sortColumn];
      };

      const aValue = resolveValue(a);
      const bValue = resolveValue(b);

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [filteredEntries, sortColumn, sortDirection]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedEntries.length / itemsPerPage),
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEntries = sortedEntries.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const handleSort = (column: EffortSortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const applyFilters = () => {
    setFilterDate(tempFilterDate);
    setFilterProject(
      tempFilterProject === ALL_OPTION ? undefined : tempFilterProject,
    );
    setFilterTask(tempFilterTask === ALL_OPTION ? undefined : tempFilterTask);
  };

  const clearFilters = () => {
    setTempFilterDate(undefined);
    setTempFilterProject(ALL_OPTION);
    setTempFilterTask(ALL_OPTION);
    setFilterDate(undefined);
    setFilterProject(undefined);
    setFilterTask(undefined);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const hasActiveFilters =
    Boolean(filterDate) || Boolean(filterProject) || Boolean(filterTask);

  return {
    // Data
    entries,
    sortedEntries,
    currentEntries,
    totalPages,

    // Filters
    tempFilterDate,
    setTempFilterDate,
    tempFilterProject,
    setTempFilterProject,
    tempFilterTask,
    setTempFilterTask,
    projectOptions,
    taskOptions,
    applyFilters,
    clearFilters,
    hasActiveFilters,
    ALL_OPTION,

    // Sorting
    sortColumn,
    sortDirection,
    handleSort,

    // Pagination
    currentPage,
    setCurrentPage,
    itemsPerPage,
    handleItemsPerPageChange,

    // Table resize
    tableHeight,
    isResizing,
    handleResizeStart,
  };
}
