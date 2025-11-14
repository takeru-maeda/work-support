import type { JSX } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { EffortsFilterPanel } from "@/features/effort-list/components/list/EffortsFilterPanel";
import { EffortsTableContainer } from "@/features/effort-list/components/list/EffortsTableContainer";
import { EffortsTable } from "@/features/effort-list/components/list/EffortsTable";
import { EffortsSummary } from "@/features/effort-list/components/list/EffortsSummary";
import { TableFooter } from "@/components/table-footer/TableFooter";
import { useEffortList } from "@/features/effort-list/hooks/useEffortList";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { Search } from "lucide-react";
import TableAndFooterSkeleton from "@/components/skeleton/TableAndFooterSkeleton";

export default function EffortsPage(): JSX.Element {
  const {
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
    ALL_OPTION,
    sortColumn,
    sortDirection,
    handleSort,
    currentEntries,
    isLoading,
    currentPage,
    setCurrentPage,
    totalPages,
    totalCount,
    itemsPerPage,
    handleItemsPerPageChange,
    hasActiveFilters,
    isProjectOptionsLoading,
  } = useEffortList();

  return (
    <PageLayout
      pageTitle="工数一覧"
      pageDescription="登録された工数データの確認と検索"
    >
      <EffortsFilterPanel
        date={tempFilterDate}
        onDateChange={setTempFilterDate}
        projectValue={tempFilterProject}
        onProjectChange={(value) =>
          setTempFilterProject(value === ALL_OPTION ? undefined : value)
        }
        taskValue={tempFilterTask}
        onTaskChange={(value) =>
          setTempFilterTask(value === ALL_OPTION ? undefined : value)
        }
        projectOptions={projectOptions}
        taskOptions={taskOptions}
        isProjectLoading={isProjectOptionsLoading}
        isTaskLoading={isProjectOptionsLoading}
        onApply={applyFilters}
        onClear={clearFilters}
        allValue={ALL_OPTION}
      />

      {isLoading ? (
        <TableAndFooterSkeleton
          rows={itemsPerPage}
          className="space-y-2 sm:space-y-4 mb-6"
          tableClassName="max-h-[calc(45dvh)] overflow-hidden"
        />
      ) : currentEntries.length == 0 ? (
        <EmptyState
          icon={<Search className="size-8" />}
          title={
            hasActiveFilters
              ? "条件に一致する工数データは見つかりませんでした"
              : "工数データがまだ登録されていません"
          }
          description={
            hasActiveFilters
              ? "条件を変更して再度お試しください。"
              : "工数登録画面から工数を追加してください。"
          }
        />
      ) : (
        <div className="space-y-2 sm:space-y-4 mb-6">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <EffortsTableContainer>
              <EffortsTable
                entries={currentEntries}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
            </EffortsTableContainer>
          </div>
          <TableFooter
            itemCount={totalCount}
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={handleItemsPerPageChange}
            itemsPerPageOptions={[10, 20, 50, 100]}
          />
        </div>
      )}

      {currentEntries.length > 0 && <EffortsSummary entries={currentEntries} />}
    </PageLayout>
  );
}
