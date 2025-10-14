"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2 } from "lucide-react"

interface NewGoal {
  id: string
  name: string
  weight: number
}

interface AddGoalsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddGoals: (goals: Omit<NewGoal, "id">[]) => void
}

export function AddGoalsDialog({ open, onOpenChange, onAddGoals }: AddGoalsDialogProps) {
  const [newGoals, setNewGoals] = useState<NewGoal[]>([{ id: "1", name: "", weight: 0 }])

  const addGoalRow = () => {
    setNewGoals([...newGoals, { id: Date.now().toString(), name: "", weight: 0 }])
  }

  const removeGoalRow = (id: string) => {
    if (newGoals.length > 1) {
      setNewGoals(newGoals.filter((goal) => goal.id !== id))
    }
  }

  const updateGoal = (id: string, field: keyof Omit<NewGoal, "id">, value: string | number) => {
    setNewGoals(newGoals.map((goal) => (goal.id === id ? { ...goal, [field]: value } : goal)))
  }

  const handleSave = () => {
    const validGoals = newGoals.filter((goal) => goal.name.trim() && goal.weight > 0)
    if (validGoals.length > 0) {
      onAddGoals(validGoals.map(({ id, ...goal }) => goal))
      setNewGoals([{ id: "1", name: "", weight: 0 }])
      onOpenChange(false)
    }
  }

  const handleCancel = () => {
    setNewGoals([{ id: "1", name: "", weight: 0 }])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] flex flex-col p-0">
        <div className="px-6 pt-6">
          <DialogHeader>
            <DialogTitle>新しい目標を追加</DialogTitle>
            <DialogDescription>複数の目標を一度に追加できます。目標名と重みを入力してください。</DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {newGoals.map((goal, index) => (
              <div key={goal.id} className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
                <div className="space-y-2">
                  <Label htmlFor={`goal-name-${goal.id}`}>目標名</Label>
                  <Input
                    id={`goal-name-${goal.id}`}
                    placeholder="例: 新機能のリリース"
                    value={goal.name}
                    onChange={(e) => updateGoal(goal.id, "name", e.target.value)}
                    className="bg-background w-full"
                  />
                </div>

                <div className="grid grid-cols-[1fr_40px] gap-3 items-end">
                  <div className="space-y-2">
                    <Label htmlFor={`goal-weight-${goal.id}`}>重み (%)</Label>
                    <Input
                      id={`goal-weight-${goal.id}`}
                      type="number"
                      min="0"
                      max="100"
                      placeholder="30"
                      value={goal.weight || ""}
                      onChange={(e) => updateGoal(goal.id, "weight", Number.parseInt(e.target.value) || 0)}
                      className="bg-background"
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeGoalRow(goal.id)}
                    disabled={newGoals.length === 1}
                    className="h-10 w-10 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={addGoalRow} className="w-full gap-2 bg-transparent">
              <Plus className="h-4 w-4" />
              目標を追加
            </Button>
          </div>
        </div>

        <div className="px-6 pb-6 pt-4 border-t border-border">
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              キャンセル
            </Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
