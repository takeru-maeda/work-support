import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/config/routes";
import { Plus, Trash2 } from "lucide-react";

interface NewGoal {
  id: string;
  name: string;
  content: string;
  weight: number;
}

export default function AddGoalsPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Date | undefined>(new Date());
  const [goals, setGoals] = useState<NewGoal[]>([
    { id: "1", name: "", content: "", weight: 0 },
  ]);

  const addGoalRow = () => {
    setGoals([
      ...goals,
      { id: Date.now().toString(), name: "", content: "", weight: 0 },
    ]);
  };

  const removeGoalRow = (id: string) => {
    if (goals.length > 1) {
      setGoals(goals.filter((goal) => goal.id !== id));
    }
  };

  const updateGoal = (
    id: string,
    field: keyof Omit<NewGoal, "id">,
    value: string | number,
  ) => {
    setGoals(
      goals.map((goal) =>
        goal.id === id ? { ...goal, [field]: value } : goal,
      ),
    );
  };

  const handleSave = () => {
    const validGoals = goals.filter(
      (goal) => goal.name.trim() && goal.weight > 0,
    );
    if (validGoals.length > 0 && period) {
      console.log("Saving goals:", { period, goals: validGoals });
      navigate(ROUTES.goals);
    }
  };

  const handleCancel = () => {
    navigate(ROUTES.goals);
  };

  return (
    <PageLayout
      pageTitle="目標を追加"
      pageDescription="期間と目標の詳細を入力してください"
      onBack={handleCancel}
    >
        <div className="mb-6 space-y-2">
          <Label htmlFor="period">期間</Label>
          <DatePicker
            date={period}
            onDateChange={setPeriod}
            placeholder="期間を選択"
          />
        </div>

        <div className="space-y-4 mb-6">
          {goals.map((goal, index) => (
            <div
              key={goal.id}
              className="rounded-lg border border-border bg-card p-4 sm:p-6 space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <input
                  type="text"
                  placeholder={`目標${index + 1}`}
                  value={goal.name}
                  onChange={(e) => updateGoal(goal.id, "name", e.target.value)}
                  className="flex-1 text-xl font-semibold border-none bg-transparent p-0 h-auto shadow-none focus:ring-0 focus:outline-none text-foreground placeholder:text-muted-foreground/50"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeGoalRow(goal.id)}
                  disabled={goals.length === 1}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`goal-content-${goal.id}`}>内容</Label>
                  <Textarea
                    id={`goal-content-${goal.id}`}
                    placeholder="目標の詳細な内容を入力してください"
                    value={goal.content}
                    onChange={(e) =>
                      updateGoal(goal.id, "content", e.target.value)
                    }
                    rows={4}
                    className="resize-y"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`goal-weight-${goal.id}`}>重み (%)</Label>
                  <Input
                    id={`goal-weight-${goal.id}`}
                    type="number"
                    min="0"
                    max="100"
                    placeholder="30"
                    value={goal.weight || ""}
                    onChange={(e) =>
                      updateGoal(
                        goal.id,
                        "weight",
                        Number.parseInt(e.target.value) || 0,
                      )
                    }
                    className="max-w-[200px]"
                  />
                </div>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={addGoalRow}
            className="w-full gap-2 bg-transparent"
          >
            <Plus className="h-4 w-4" />
            目標を追加
          </Button>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={handleCancel}>
            キャンセル
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </div>
    </PageLayout>
  );
}
