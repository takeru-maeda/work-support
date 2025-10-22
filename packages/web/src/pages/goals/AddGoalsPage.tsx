import { Plus } from "lucide-react";

import { FormActions } from "@/components/form/FormActions";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { GoalFormRow } from "@/features/goals/components/add-goal/GoalFormRow";
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
  } = useAddGoalsManager();

  return (
    <PageLayout
      pageTitle="目標を追加"
      pageDescription="期間と目標の詳細を入力してください"
      onBack={handleCancel}
    >
      <GoalPeriodPicker
        periodStart={periodStart}
        periodEnd={periodEnd}
        onPeriodStartChange={setPeriodStart}
        onPeriodEndChange={setPeriodEnd}
        className="mb-6"
      />

      <div className="space-y-4 mb-6">
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
          />
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={addGoal}
          className="w-full gap-2 bg-transparent"
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
        onSave={handleSave}
        saveDisabled={!isWeightValid}
      />
    </PageLayout>
  );
}
