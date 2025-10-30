import { GoalsOverviewPanel } from "@/features/goals/components/current/GoalsOverviewPanel";
import { GoalsDataTable } from "@/features/goals/components/current/GoalsDataTable";
import { GoalsWeightWarning } from "@/features/goals/components/current/GoalsWeightWarning";
import { GoalContentDialog } from "@/features/goals/components/current/GoalContentDialog";
import { useGoalsTableManager } from "@/features/goals/hooks/useGoalsTableManager";
import GoalsEmptyPanel from "./GoalsEmptyPanel";
import CardContainer from "@/components/shared/CardContainer";

export function GoalsTable() {
  const {
    period,
    sortedGoals,
    sortField,
    sortDirection,
    handleSort,
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

          <div className="space-y-4 pt-4 mb-1">
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
    </>
  );
}
