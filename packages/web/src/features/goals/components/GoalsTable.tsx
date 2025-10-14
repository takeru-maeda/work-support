"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { TrendingUp, Plus, Trash2, Target, Award, ArrowUpDown, ArrowUp, ArrowDown, Eye } from "lucide-react"

import { ROUTES } from "@/config/routes"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Goal {
  id: string
  name: string
  weight: number
  progress: number
  content?: string
}

interface HistoricalData {
  date: string
  [key: string]: number | string
}

type SortField = "name" | "weight" | "progress" | null
type SortDirection = "asc" | "desc" | null

export function GoalsTable() {
  const navigate = useNavigate()

  const [period, setPeriod] = useState({
    start: new Date("2025-04-01"),
    end: new Date("2025-10-01"),
  })

  const [goals, setGoals] = useState<Goal[]>([
    {
      id: "1",
      name: "Launch new product feature",
      weight: 35,
      progress: 75,
      content:
        "新しい製品機能をリリースし、ユーザーエクスペリエンスを向上させる。主要な機能には、リアルタイム通知、高度な検索機能、カスタマイズ可能なダッシュボードが含まれます。",
    },
    {
      id: "2",
      name: "Improve team collaboration",
      weight: 25,
      progress: 60,
      content:
        "チーム間のコミュニケーションとコラボレーションを強化するため、定期的なミーティングの実施、共有ドキュメントの整備、コラボレーションツールの導入を行います。",
    },
    {
      id: "3",
      name: "Reduce technical debt",
      weight: 20,
      progress: 40,
      content:
        "既存のコードベースをリファクタリングし、技術的負債を削減します。レガシーコードの更新、テストカバレッジの向上、ドキュメントの改善を含みます。",
    },
    {
      id: "4",
      name: "Enhance documentation",
      weight: 20,
      progress: 85,
      content:
        "プロジェクトのドキュメントを包括的に更新し、新しいメンバーのオンボーディングを容易にします。API仕様書、アーキテクチャ図、ベストプラクティスガイドを含みます。",
    },
  ])

  const [historicalData] = useState<HistoricalData[]>([
    { date: "2025/04/01", "1": 20, "2": 15, "3": 10, "4": 30 },
    { date: "2025/05/01", "1": 35, "2": 25, "3": 15, "4": 45 },
    { date: "2025/06/01", "1": 50, "2": 40, "3": 25, "4": 60 },
    { date: "2025/07/01", "1": 60, "2": 50, "3": 30, "4": 70 },
    { date: "2025/08/01", "1": 70, "2": 55, "3": 35, "4": 80 },
    { date: "2025/09/01", "1": 75, "2": 60, "3": 40, "4": 85 },
  ])

  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [isContentDialogOpen, setIsContentDialogOpen] = useState(false)
  const [editedContent, setEditedContent] = useState("")

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        setSortField(null)
        setSortDirection(null)
      }
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 text-muted-foreground/50" />
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="h-4 w-4 ml-1 text-foreground" />
    }
    return <ArrowDown className="h-4 w-4 ml-1 text-foreground" />
  }

  const sortedGoals = [...goals].sort((a, b) => {
    if (!sortField || !sortDirection) return 0

    let comparison = 0
    if (sortField === "name") {
      comparison = a.name.localeCompare(b.name)
    } else if (sortField === "weight") {
      comparison = a.weight - b.weight
    } else if (sortField === "progress") {
      comparison = a.progress - b.progress
    }

    return sortDirection === "asc" ? comparison : -comparison
  })

  const removeGoal = (id: string) => {
    setGoals(goals.filter((goal) => goal.id !== id))
  }

  const updateGoalName = (id: string, name: string) => {
    setGoals(goals.map((goal) => (goal.id === id ? { ...goal, name } : goal)))
  }

  const updateWeight = (id: string, weight: number) => {
    setGoals(goals.map((goal) => (goal.id === id ? { ...goal, weight: Math.max(0, weight) } : goal)))
  }

  const updateProgress = (id: string, progress: number) => {
    setGoals(goals.map((goal) => (goal.id === id ? { ...goal, progress: Math.min(100, Math.max(0, progress)) } : goal)))
  }

  const totalWeight = goals.reduce((sum, goal) => sum + goal.weight, 0)
  const weightedProgressSum = goals.reduce((sum, goal) => sum + (goal.progress * goal.weight) / 100, 0)
  const overallProgress = totalWeight > 0 ? (weightedProgressSum / totalWeight) * 100 : 0

  const calculatePreviousWeekProgress = () => {
    if (historicalData.length === 0) return { overall: 0, weighted: 0 }

    const lastHistoricalEntry = historicalData[historicalData.length - 1]

    let totalProgress = 0
    let count = 0
    goals.forEach((goal) => {
      const historicalProgress = lastHistoricalEntry[goal.id]
      if (typeof historicalProgress === "number") {
        totalProgress += historicalProgress
        count++
      }
    })
    const historicalOverallProgress = count > 0 ? totalProgress / count : 0

    let historicalWeightedSum = 0
    goals.forEach((goal) => {
      const historicalProgress = lastHistoricalEntry[goal.id]
      if (typeof historicalProgress === "number") {
        historicalWeightedSum += (historicalProgress * goal.weight) / 100
      }
    })

    return {
      overall: historicalOverallProgress,
      weighted: historicalWeightedSum,
    }
  }

  const previousWeekProgress = calculatePreviousWeekProgress()
  const overallProgressDiff = overallProgress - previousWeekProgress.overall
  const weightedProgressDiff = weightedProgressSum - previousWeekProgress.weighted

  const formatProgressDiff = (diff: number) => {
    const sign = diff >= 0 ? "+" : ""
    return `${sign}${diff.toFixed(1)}%`
  }

  const getProgressDiffColor = (diff: number) => {
    if (diff > 0) return "text-green-600 dark:text-green-400"
    if (diff < 0) return "text-red-600 dark:text-red-400"
    return "text-muted-foreground"
  }

  const openContentDialog = (goal: Goal) => {
    setSelectedGoal(goal)
    setEditedContent(goal.content || "")
    setIsContentDialogOpen(true)
  }

  const updateGoalContent = () => {
    if (selectedGoal) {
      setGoals(goals.map((goal) => (goal.id === selectedGoal.id ? { ...goal, content: editedContent } : goal)))
      setIsContentDialogOpen(false)
    }
  }

  return (
    <>
      <div className="w-full max-w-full rounded-lg border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-2/10">
                <TrendingUp className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <h3 className="text-lg font-semibold leading-none tracking-tight text-card-foreground">目標進捗</h3>
                <p className="text-sm text-muted-foreground mt-1.5">重み付けされた目標と達成状況を追跡</p>
              </div>
            </div>
            <Button onClick={() => navigate(ROUTES.goalsAdd)} size="sm" className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">追加</span>
              <span className="sm:hidden">追加</span>
            </Button>
          </div>
          <div className="pt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">期間:</span>
              <DatePicker
                date={period.start}
                onDateChange={(date) => date && setPeriod({ ...period, start: date })}
                placeholder="開始日"
              />
              <span className="text-muted-foreground">-</span>
              <DatePicker
                date={period.end}
                onDateChange={(date) => date && setPeriod({ ...period, end: date })}
                placeholder="終了日"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 rounded-lg p-4 sm:p-6 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-md bg-chart-1/10">
                    <Target className="h-4 w-4 text-chart-1" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">全体進捗</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl sm:text-4xl font-bold text-foreground tabular-nums">
                      {overallProgress.toFixed(1)}
                      <span className="text-2xl sm:text-3xl text-muted-foreground ml-1">%</span>
                    </div>
                    <span className={`text-sm font-semibold ${getProgressDiffColor(overallProgressDiff)}`}>
                      {formatProgressDiff(overallProgressDiff)}
                    </span>
                  </div>
                  <Progress value={overallProgress} className="h-2" />
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 sm:p-6 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-md bg-chart-2/10">
                    <Award className="h-4 w-4 text-chart-2" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">加重進捗</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl sm:text-4xl font-bold text-foreground tabular-nums">
                      {weightedProgressSum.toFixed(1)}
                      <span className="text-2xl sm:text-3xl text-muted-foreground ml-1">%</span>
                    </div>
                    <span className={`text-sm font-semibold ${getProgressDiffColor(weightedProgressDiff)}`}>
                      {formatProgressDiff(weightedProgressDiff)}
                    </span>
                  </div>
                  <Progress value={weightedProgressSum} className="h-2" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 pt-0 space-y-4">
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[500px]">
                <TableHeader className="sticky top-0 bg-muted/50 z-10">
                  <TableRow>
                    <TableHead
                      className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none min-w-[120px]"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center">
                        目標
                        {getSortIcon("name")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-muted-foreground w-20 sm:w-24 cursor-pointer hover:text-foreground transition-colors select-none"
                      onClick={() => handleSort("weight")}
                    >
                      <div className="flex items-center">
                        重み
                        {getSortIcon("weight")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-muted-foreground w-24 sm:w-32 cursor-pointer hover:text-foreground transition-colors select-none"
                      onClick={() => handleSort("progress")}
                    >
                      <div className="flex items-center">
                        進捗
                        {getSortIcon("progress")}
                      </div>
                    </TableHead>
                    <TableHead className="text-muted-foreground w-16 text-center">内容</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedGoals.map((goal) => (
                    <TableRow key={goal.id}>
                      <TableCell className="min-w-[120px]">
                        <Input
                          value={goal.name}
                          onChange={(e) => updateGoalName(goal.id, e.target.value)}
                          className="border-0 bg-transparent font-medium text-foreground focus-visible:ring-1 focus-visible:ring-ring h-8 px-2 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={goal.weight}
                            onChange={(e) => updateWeight(goal.id, Number.parseInt(e.target.value) || 0)}
                            className="w-12 sm:w-16 h-8 text-center bg-background text-sm"
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={goal.progress}
                            onChange={(e) => updateProgress(goal.id, Number.parseInt(e.target.value) || 0)}
                            className="w-12 sm:w-16 h-8 text-center bg-background text-sm"
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openContentDialog(goal)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeGoal(goal.id)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {totalWeight !== 100 && (
            <p className="text-sm text-warning">⚠️ 合計重み: {totalWeight}% (100%になるべきです)</p>
          )}
        </div>
      </div>

      <Dialog open={isContentDialogOpen} onOpenChange={setIsContentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedGoal?.name}</DialogTitle>
            <DialogDescription>目標の詳細内容を編集できます</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              placeholder="目標の内容を入力してください"
              className="min-h-[200px] resize-y"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsContentDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={updateGoalContent}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
