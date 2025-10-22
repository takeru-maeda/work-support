import { GoalsOverviewPanel } from "@/features/goals/components/current/GoalsOverviewPanel";
import { GoalsDataTable } from "@/features/goals/components/current/GoalsDataTable";
import { GoalsWeightWarning } from "@/features/goals/components/current/GoalsWeightWarning";
import { GoalContentDialog } from "@/features/goals/components/current/GoalContentDialog";
import { useGoalsTableManager } from "@/features/goals/hooks/useGoalsTableManager";

export function GoalsTable() {
  const {
    period,
    setPeriodStart,
    setPeriodEnd,
    sortedGoals,
    sortField,
    sortDirection,
    handleSort,
    addGoal,
    removeGoal,
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
    onNavigateToAdd,
  } = useGoalsTableManager();

  return (
    <>
      <div className="w-full max-w-full overflow-hidden rounded-lg border border-border text-card-foreground shadow-sm">
        <GoalsOverviewPanel
          periodStart={period.start}
          periodEnd={period.end}
          onPeriodStartChange={setPeriodStart}
          onPeriodEndChange={setPeriodEnd}
          onAddGoal={onNavigateToAdd}
          overallProgress={overallProgress}
          weightedProgressSum={weightedProgressSum}
          overallProgressDiff={overallProgressDiff}
          weightedProgressDiff={weightedProgressDiff}
        />

        <div className="space-y-4 p-4 pt-0 sm:px-6">
          <GoalsDataTable
            goals={sortedGoals}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            onNameChange={updateGoalName}
            onWeightChange={updateGoalWeight}
            onProgressChange={updateGoalProgress}
            onRemove={removeGoal}
            onViewContent={openContentDialog}
          />

          <GoalsWeightWarning
            totalWeight={totalWeight}
            isBalanced={isWeightBalanced}
          />
        </div>
      </div>

      <GoalContentDialog
        open={isContentDialogOpen}
        goal={selectedGoal}
        editedContent={editedContent}
        onContentChange={setEditedContent}
        onSave={updateGoalContent}
        onOpenChange={handleContentDialogOpenChange}
      />
    </>
  );
}
