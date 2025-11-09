import CardContainer from "@/components/shared/CardContainer";
import { TableFooter } from "@/components/table-footer/TableFooter";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { Target } from "lucide-react";

import { PastGoalsDataTable } from "@/features/goals/components/past/PastGoalsDataTable";
import { PastGoalsFilter } from "@/features/goals/components/past/PastGoalsFilter";
import { PastGoalContentDialog } from "@/features/goals/components/past/PastGoalContentDialog";
import PastGoalSectionHeader from "@/features/goals/components/past/PastGoalSectionHeader";
import { usePastGoals } from "@/features/goals/hooks/usePastGoals";
import TableAndFooterSkeleton from "@/components/skeleton/TableAndFooterSkeleton";

export function PastGoalsTable() {
  const {
    goals,
    selectedGoal,
    isContentDialogOpen,
    currentPage,
    totalPages,
    totalCount,
    itemsPerPage,
    isLoading,
    draftTitle,
    setDraftTitle,
    draftStartDate,
    setDraftStartDate,
    draftEndDate,
    setDraftEndDate,
    draftProgressMin,
    setDraftProgressMin,
    draftProgressMax,
    setDraftProgressMax,
    sortBy,
    sortDirection,
    handleSort,
    handleApplyFilters,
    handleClearFilters,
    handleViewContent,
    handleContentDialogOpenChange,
    handlePageChange,
    handlePageSizeChange,
  } = usePastGoals();

  return (
    <CardContainer className="space-y-6">
      <PastGoalSectionHeader />

      <PastGoalsFilter
        titleValue={draftTitle}
        onTitleChange={setDraftTitle}
        startDate={draftStartDate}
        onStartDateChange={setDraftStartDate}
        endDate={draftEndDate}
        onEndDateChange={setDraftEndDate}
        progressMinValue={draftProgressMin}
        onProgressMinChange={setDraftProgressMin}
        progressMaxValue={draftProgressMax}
        onProgressMaxChange={setDraftProgressMax}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />

      {isLoading ? (
        <TableAndFooterSkeleton rows={itemsPerPage} />
      ) : goals.length > 0 ? (
        <>
          <PastGoalsDataTable
            goals={goals}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSort={handleSort}
            onViewContent={handleViewContent}
          />
          <TableFooter
            currentPage={currentPage}
            totalPages={totalPages}
            itemCount={totalCount}
            onPageChange={handlePageChange}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={handlePageSizeChange}
          />
        </>
      ) : (
        <EmptyState
          icon={<Target className="size-8" />}
          title="該当する目標は見つかりませんでした"
          description="条件を変更して再度お試しください。"
        />
      )}

      <PastGoalContentDialog
        open={isContentDialogOpen}
        goal={selectedGoal}
        onOpenChange={handleContentDialogOpenChange}
      />
    </CardContainer>
  );
}
