import type { JSX } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { EffortsFilterPanel } from "@/features/effort-list/components/list/EffortsFilterPanel";
import { EffortsTableContainer } from "@/features/effort-list/components/list/EffortsTableContainer";
import { EffortsTable } from "@/features/effort-list/components/list/EffortsTable";
import { EffortsSummary } from "@/features/effort-list/components/list/EffortsSummary";
import { TableResizeHandle } from "@/components/resizable/TableResizeHandle";
import { TableFooter } from "@/components/table-footer/TableFooter";
import { useEffortList } from "@/features/effort-list/hooks/useEffortList";

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
    hasActiveFilters,
    ALL_OPTION,
    sortColumn,
    sortDirection,
    handleSort,
    currentEntries,
    sortedEntries,
    currentPage,
    setCurrentPage,
    totalPages,
    itemsPerPage,
    handleItemsPerPageChange,
    tableHeight,
    isResizing,
    handleResizeStart,
  } = useEffortList();

  return (
    <PageLayout
      pageTitle="工数一覧"
      pageDescription="登録された工数データを確認できます"
    >
      <EffortsFilterPanel
        date={tempFilterDate}
        onDateChange={setTempFilterDate}
        projectValue={tempFilterProject}
        onProjectChange={setTempFilterProject}
        taskValue={tempFilterTask}
        onTaskChange={setTempFilterTask}
        projectOptions={projectOptions}
        taskOptions={taskOptions}
        onApply={applyFilters}
        onClear={clearFilters}
        allValue={ALL_OPTION}
      />

      <div className="mb-2 overflow-hidden rounded-lg border border-border bg-card">
        <EffortsTableContainer height={tableHeight}>
          <EffortsTable
            entries={currentEntries}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            hasActiveFilters={hasActiveFilters}
          />
        </EffortsTableContainer>
        <TableResizeHandle
          onResizeStart={handleResizeStart}
          isActive={isResizing}
        />
      </div>

      {sortedEntries.length > 0 && (
        <TableFooter
          itemCount={sortedEntries.length}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={handleItemsPerPageChange}
          itemsPerPageOptions={[10, 20, 50, 100]}
          className="mb-6"
        />
      )}

      {sortedEntries.length > 0 && <EffortsSummary entries={sortedEntries} />}
    </PageLayout>
  );
}
