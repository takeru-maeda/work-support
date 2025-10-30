import { useMemo, useState } from "react";
import { PastGoalContentDialog } from "@/features/goals/components/past/PastGoalContentDialog";
import { PastGoalsDataTable } from "@/features/goals/components/past/PastGoalsDataTable";
import type {
  PastGoal,
  SortDirection,
  SortField,
} from "@/features/goals/types";
import { PastGoalsFilter } from "@/features/goals/components/past/PastGoalsFilter";
import { TableFooter } from "@/components/table-footer/TableFooter";
import CardContainer from "@/components/shared/CardContainer";
import { SectionHeader } from "@/components/sections/SectionHeader";
import { History } from "lucide-react";

const toDateFromPeriodSegment = (
  segment: string | undefined,
): Date | undefined => {
  if (!segment) {
    return undefined;
  }
  const normalized = segment.trim().replace(/\//g, "-");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const INITIAL_GOALS: PastGoal[] = [
  {
    id: "1",
    name: "システムリファクタリング",
    weight: 30,
    progress: 100,
    period: "2024/10/01-2025/03/31",
    content:
      "レガシーシステムの全面的なリファクタリングを実施し、保守性とパフォーマンスを大幅に向上させました。モジュール化、テストカバレッジの向上、最新技術スタックへの移行を含みます。",
  },
  {
    id: "2",
    name: "新規顧客獲得",
    weight: 40,
    progress: 95,
    period: "2024/10/01-2025/03/31",
    content:
      "マーケティングキャンペーンとセールス活動を強化し、目標を上回る新規顧客の獲得に成功しました。デジタルマーケティング、イベント参加、パートナーシップ構築を実施しました。",
  },
  {
    id: "3",
    name: "チーム研修実施",
    weight: 30,
    progress: 100,
    period: "2024/11/01-2025/02/28",
    content:
      "全チームメンバーを対象とした包括的な研修プログラムを実施し、技術スキルとソフトスキルの向上を達成しました。",
  },
  {
    id: "4",
    name: "品質改善プロジェクト",
    weight: 35,
    progress: 100,
    period: "2024/09/01-2025/01/31",
    content:
      "製品品質の向上を目的としたプロジェクトを完了し、バグ発生率を50%削減しました。",
  },
  {
    id: "5",
    name: "ドキュメント整備",
    weight: 25,
    progress: 90,
    period: "2024/08/01-2024/12/31",
    content:
      "プロジェクトドキュメントの整備と標準化を実施し、情報共有の効率を向上させました。",
  },
  {
    id: "6",
    name: "セキュリティ強化",
    weight: 40,
    progress: 100,
    period: "2024/07/01-2024/11/30",
    content:
      "セキュリティ監査を実施し、脆弱性を修正。多要素認証とアクセス制御を強化しました。",
  },
  {
    id: "7",
    name: "パフォーマンス最適化",
    weight: 30,
    progress: 95,
    period: "2024/06/01-2024/10/31",
    content:
      "システムパフォーマンスの最適化により、レスポンス時間を40%短縮しました。",
  },
];

export function PastGoalsTable() {
  const [pastGoals] = useState<PastGoal[]>(INITIAL_GOALS);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [sortBy, setSortBy] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedGoal, setSelectedGoal] = useState<PastGoal | null>(null);
  const [isContentDialogOpen, setIsContentDialogOpen] = useState(false);
  const [filterTitle, setFilterTitle] = useState<string>("");
  const [filterStartDate, setFilterStartDate] = useState<Date | undefined>(
    undefined,
  );
  const [filterEndDate, setFilterEndDate] = useState<Date | undefined>(
    undefined,
  );
  const [filterProgressMin, setFilterProgressMin] = useState<number | null>(
    null,
  );
  const [filterProgressMax, setFilterProgressMax] = useState<number | null>(
    null,
  );
  const [tempFilterTitle, setTempFilterTitle] = useState<string>("");
  const [tempFilterStartDate, setTempFilterStartDate] = useState<
    Date | undefined
  >(undefined);
  const [tempFilterEndDate, setTempFilterEndDate] = useState<Date | undefined>(
    undefined,
  );
  const [tempFilterProgressMin, setTempFilterProgressMin] =
    useState<string>("");
  const [tempFilterProgressMax, setTempFilterProgressMax] =
    useState<string>("");

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortBy(null);
      }
    } else {
      setSortBy(field);
      setSortDirection("asc");
    }
  };

  const filteredGoals = useMemo(() => {
    return pastGoals.filter((goal) => {
      const titleMatch = filterTitle
        ? goal.name.toLowerCase().includes(filterTitle.toLowerCase())
        : true;

      const [periodStartRaw, periodEndRaw] = goal.period.split("-");
      const periodStart = toDateFromPeriodSegment(periodStartRaw);
      const periodEnd =
        toDateFromPeriodSegment(periodEndRaw) ?? periodStart ?? undefined;

      const startDateMatch = filterStartDate
        ? (periodEnd ?? periodStart ?? new Date(0)) >= filterStartDate
        : true;
      const endDateMatch = filterEndDate
        ? (periodStart ?? periodEnd ?? new Date(8640000000000000)) <=
          filterEndDate
        : true;

      const progressMinMatch =
        !filterProgressMin || goal.progress >= filterProgressMin;
      const progressMaxMatch =
        !filterProgressMax || goal.progress <= filterProgressMax;

      return (
        titleMatch &&
        startDateMatch &&
        endDateMatch &&
        progressMinMatch &&
        progressMaxMatch
      );
    });
  }, [
    pastGoals,
    filterTitle,
    filterStartDate,
    filterEndDate,
    filterProgressMin,
    filterProgressMax,
  ]);

  const sortedGoals = useMemo(() => {
    if (!sortBy || !sortDirection) return filteredGoals;

    return [...filteredGoals].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

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
  }, [filteredGoals, sortBy, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedGoals.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentGoals = sortedGoals.slice(startIndex, startIndex + itemsPerPage);

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const handleOpenContent = (goal: PastGoal) => {
    setSelectedGoal(goal);
    setIsContentDialogOpen(true);
  };

  const toProgressFilterValue = (value: string): number | null => {
    if (value.trim() === "") {
      return null;
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return null;
    }
    const clamped = Math.min(Math.max(parsed, 0), 100);
    return clamped;
  };

  const handleApplyFilter = () => {
    setFilterTitle(tempFilterTitle.trim());
    setFilterStartDate(tempFilterStartDate);
    setFilterEndDate(tempFilterEndDate);
    setFilterProgressMin(toProgressFilterValue(tempFilterProgressMin));
    setFilterProgressMax(toProgressFilterValue(tempFilterProgressMax));
    setCurrentPage(1);
  };

  const handleClearFilter = () => {
    setTempFilterTitle("");
    setTempFilterStartDate(undefined);
    setTempFilterEndDate(undefined);
    setTempFilterProgressMin("");
    setTempFilterProgressMax("");
    setFilterTitle("");
    setFilterStartDate(undefined);
    setFilterEndDate(undefined);
    setFilterProgressMin(null);
    setFilterProgressMax(null);
    setCurrentPage(1);
  };

  return (
    <>
      <CardContainer className="space-y-4">
        <SectionHeader
          icon={History}
          iconClassName="bg-muted"
          title="過去の目標"
          description="完了した目標の履歴"
        />

        <PastGoalsFilter
          titleValue={tempFilterTitle}
          onTitleChange={(value) => setTempFilterTitle(value)}
          startDate={tempFilterStartDate}
          onStartDateChange={setTempFilterStartDate}
          endDate={tempFilterEndDate}
          onEndDateChange={setTempFilterEndDate}
          progressMinValue={tempFilterProgressMin}
          onProgressMinChange={(value) => setTempFilterProgressMin(value)}
          progressMaxValue={tempFilterProgressMax}
          onProgressMaxChange={(value) => setTempFilterProgressMax(value)}
          onApply={handleApplyFilter}
          onClear={handleClearFilter}
        />

        <div className="space-y-2 mb-2">
          <PastGoalsDataTable
            goals={currentGoals}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSort={handleSort}
            onViewContent={handleOpenContent}
          />

          <TableFooter
            itemCount={sortedGoals.length}
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </div>
      </CardContainer>

      <PastGoalContentDialog
        open={isContentDialogOpen}
        goal={selectedGoal}
        onOpenChange={setIsContentDialogOpen}
      />
    </>
  );
}
