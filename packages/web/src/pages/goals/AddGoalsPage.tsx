import { useState } from "react";
import { Plus } from "lucide-react";
import { format } from "date-fns";

import { FormActions } from "@/components/form/FormActions";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { GoalFormRow } from "@/features/goals/components/add-goal/GoalFormRow";
import { GoalSaveConfirmDialog } from "@/features/goals/components/add-goal/GoalSaveConfirmDialog";
import { GoalWeightAlert } from "@/features/goals/components/add-goal/GoalWeightAlert";
import { GoalWeightSummary } from "@/features/goals/components/add-goal/GoalWeightSummary";
import { GoalPeriodPicker } from "@/features/goals/components/shared/GoalPeriodPicker";
import { useAddGoalsManager } from "@/features/goals/hooks/useAddGoalsManager";
import type { NewGoal } from "@/features/goals/types";

export default function AddGoalsPage() {
  const {
    periodStart,
    periodEnd,
    setPeriodStart,
    setPeriodEnd,
    goals,
    addGoal,
    removeGoal,
    updateGoal,
    handleSave,
    handleCancel,
    totalWeight,
    isWeightValid,
    isWeightExceeded,
    periodError,
    isPeriodValid,
    latestGoalEndDate,
    isSaving,
  } = useAddGoalsManager();
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);

  const handleRequestSave = () => {
    if (isSaving || !isWeightValid || !isPeriodValid) {
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsConfirmOpen(false);
    await handleSave();
  };

  return (
    <PageLayout
      pageTitle="目標を追加"
      pageDescription="期間と目標の詳細を入力してください"
      onBack={handleCancel}
      loading={isSaving}
    >
      <GoalPeriodPicker
        periodStart={periodStart}
        periodEnd={periodEnd}
        onPeriodStartChange={setPeriodStart}
        onPeriodEndChange={setPeriodEnd}
        className="mb-3"
        disabled={isSaving}
      />
      <div className="mb-6 space-y-2">
        {latestGoalEndDate && (
          <p className="text-xs text-muted-foreground">
            現在の目標期間の終了日（{format(latestGoalEndDate, "yyyy/MM/dd")}
            ）よりも未来の日付を選択してください。
          </p>
        )}
        {periodError && (
          <p className="text-sm text-destructive-foreground">{periodError}</p>
        )}
      </div>

      <div className="mb-6 space-y-4">
        {goals.map((goal: NewGoal, index: number) => (
          <GoalFormRow
            key={goal.id}
            id={goal.id}
            index={index}
            name={goal.name}
            content={goal.content}
            weight={goal.weight}
            disableRemove={goals.length === 1}
            onNameChange={(value) => updateGoal(goal.id, "name", value)}
            onContentChange={(value) => updateGoal(goal.id, "content", value)}
            onWeightChange={(value) => updateGoal(goal.id, "weight", value)}
            onRemove={() => removeGoal(goal.id)}
            disabled={isSaving}
          />
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={addGoal}
          className="w-full gap-2 bg-transparent"
          disabled={isSaving}
        >
          <Plus className="h-4 w-4" />
          目標を追加
        </Button>
      </div>

      <GoalWeightSummary
        totalWeight={totalWeight}
        isExceeded={isWeightExceeded}
      />

      <GoalWeightAlert isExceeded={isWeightExceeded} />

      <FormActions
        onCancel={handleCancel}
        onSave={handleRequestSave}
        saveDisabled={!isWeightValid || !isPeriodValid || isSaving}
        saveLabel={isSaving ? "保存中..." : "保存"}
      />

      <GoalSaveConfirmDialog
        open={isConfirmOpen}
        isSaving={isSaving}
        onOpenChange={setIsConfirmOpen}
        onConfirm={handleConfirmSave}
      />
    </PageLayout>
  );
}
