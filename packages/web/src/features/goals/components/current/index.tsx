import CardContainer from "@/components/shared/CardContainer";
import { TableSkeleton } from "@/components/skeleton/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GoalContentDialog } from "@/features/goals/components/current/GoalContentDialog";
import { GoalDeleteConfirmDialog } from "@/features/goals/components/current/GoalDeleteConfirmDialog";
import { GoalsDataTable } from "@/features/goals/components/current/GoalsDataTable";
import { GoalsOverviewPanel } from "@/features/goals/components/current/GoalsOverviewPanel";
import { GoalsWeightWarning } from "@/features/goals/components/current/GoalsWeightWarning";
import { useGoalsTableManager } from "@/features/goals/hooks/useGoalsTableManager";

import GoalSectionHeader from "./GoalSectionHeader";
import GoalsEmptyPanel from "./GoalsEmptyPanel";

export function GoalsTable() {
  const {
    period,
    sortedGoals,
    sortField,
    sortDirection,
    handleSort,
    updateGoalName,
    updateGoalWeight,
    updateGoalProgress,
    totalWeight,
    weightedProgressSum,
    overallProgress,
    overallProgressDiff,
    weightedProgressDiff,
    isWeightBalanced,
    isContentDialogOpen,
    selectedGoal,
    editedContent,
    setEditedContent,
    openContentDialog,
    handleContentDialogOpenChange,
    updateGoalContent,
    isLoading,
    isSaving,
    hasChanges,
    saveChanges,
    requestRemoveGoal,
    deleteTarget,
    setDeleteTarget,
    confirmDelete,
    isDeleting,
    errorMessage,
    onNavigateToAdd,
  } = useGoalsTableManager();

  if (isLoading) {
    return (
      <CardContainer className="space-y-4">
        <GoalSectionHeader />
        <Skeleton className="h-6 w-50" />
        <div className="flex gap-4">
          <Skeleton className="h-32 w-1/2" />
          <Skeleton className="h-32 w-1/2" />
        </div>
        <TableSkeleton />
        <Skeleton className="ml-auto h-8 w-20" />
      </CardContainer>
    );
  }

  return (
    <>
      {sortedGoals.length > 0 ? (
        <CardContainer>
          <GoalsOverviewPanel
            periodStart={period.start}
            periodEnd={period.end}
            onAddGoal={onNavigateToAdd}
            overallProgress={overallProgress}
            weightedProgressSum={weightedProgressSum}
            overallProgressDiff={overallProgressDiff}
            weightedProgressDiff={weightedProgressDiff}
          />

          {errorMessage && (
            <p className="mt-3 text-sm text-destructive-foreground">
              {errorMessage}
            </p>
          )}

          <div className="space-y-4 pt-4 mb-1">
            <GoalsDataTable
              goals={sortedGoals}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              onNameChange={updateGoalName}
              onWeightChange={updateGoalWeight}
              onProgressChange={updateGoalProgress}
              onRemove={requestRemoveGoal}
              onViewContent={openContentDialog}
              disabled={isSaving}
            />

            <div className="flex justify-between">
              <GoalsWeightWarning
                totalWeight={totalWeight}
                isBalanced={isWeightBalanced}
              />
              <Button
                className="ml-auto gap-2"
                onClick={() => void saveChanges()}
                disabled={isSaving || !hasChanges || !isWeightBalanced}
              >
                {isSaving ? "更新中..." : "更新"}
              </Button>
            </div>
          </div>
        </CardContainer>
      ) : (
        <GoalsEmptyPanel onNavigateToAdd={onNavigateToAdd} />
      )}

      <GoalContentDialog
        open={isContentDialogOpen}
        goal={selectedGoal}
        editedContent={editedContent}
        onContentChange={setEditedContent}
        onSave={updateGoalContent}
        onOpenChange={handleContentDialogOpenChange}
      />

      <GoalDeleteConfirmDialog
        goal={deleteTarget}
        open={Boolean(deleteTarget)}
        isDeleting={isDeleting}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
      />
    </>
  );
}
