"use client"

import { useState } from "react"
import { History, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Eye } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface PastGoal {
  id: string
  name: string
  weight: number
  progress: number
  period: string
  content?: string
}

type SortField = "name" | "weight" | "period" | "progress"
type SortDirection = "asc" | "desc" | null

export function PastGoalsTable() {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [sortBy, setSortBy] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  const [pastGoals] = useState<PastGoal[]>([
    {
      id: "1",
      name: "システムリファクタリング",
      weight: 30,
      progress: 100,
      period: "2024/10/01-2025/03/31",
      content:
        "レガシーシステムの全面的なリファクタリングを実施し、保守性とパフォーマンスを大幅に向上させました。モジュール化、テストカバレッジの向上、最新技術スタックへの移行を含みます。",
    },
    {
      id: "2",
      name: "新規顧客獲得",
      weight: 40,
      progress: 95,
      period: "2024/10/01-2025/03/31",
      content:
        "マーケティングキャンペーンとセールス活動を強化し、目標を上回る新規顧客の獲得に成功しました。デジタルマーケティング、イベント参加、パートナーシップ構築を実施しました。",
    },
    {
      id: "3",
      name: "チーム研修実施",
      weight: 30,
      progress: 100,
      period: "2024/11/01-2025/02/28",
      content:
        "全チームメンバーを対象とした包括的な研修プログラムを実施し、技術スキルとソフトスキルの向上を達成しました。",
    },
    {
      id: "4",
      name: "品質改善プロジェクト",
      weight: 35,
      progress: 100,
      period: "2024/09/01-2025/01/31",
      content: "製品品質の向上を目的としたプロジェクトを完了し、バグ発生率を50%削減しました。",
    },
    {
      id: "5",
      name: "ドキュメント整備",
      weight: 25,
      progress: 90,
      period: "2024/08/01-2024/12/31",
      content: "プロジェクトドキュメントの整備と標準化を実施し、情報共有の効率を向上させました。",
    },
    {
      id: "6",
      name: "セキュリティ強化",
      weight: 40,
      progress: 100,
      period: "2024/07/01-2024/11/30",
      content: "セキュリティ監査を実施し、脆弱性を修正。多要素認証とアクセス制御を強化しました。",
    },
    {
      id: "7",
      name: "パフォーマンス最適化",
      weight: 30,
      progress: 95,
      period: "2024/06/01-2024/10/31",
      content: "システムパフォーマンスの最適化により、レスポンス時間を40%短縮しました。",
    },
  ])

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        setSortDirection(null)
        setSortBy(null)
      }
    } else {
      setSortBy(field)
      setSortDirection("asc")
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="h-4 w-4" />
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="h-4 w-4" />
    }
    return <ArrowDown className="h-4 w-4" />
  }

  const sortedGoals = [...pastGoals].sort((a, b) => {
    if (!sortBy || !sortDirection) return 0

    const aValue: string | number = a[sortBy]
    const bValue: string | number = b[sortBy]

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue
    }

    return 0
  })

  const totalPages = Math.ceil(sortedGoals.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentGoals = sortedGoals.slice(startIndex, endIndex)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)

      if (currentPage > 3) {
        pages.push("ellipsis-start")
      }

      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push("ellipsis-end")
      }

      pages.push(totalPages)
    }

    return pages
  }

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value))
    setCurrentPage(1)
  }

  const [selectedGoal, setSelectedGoal] = useState<PastGoal | null>(null)
  const [isContentDialogOpen, setIsContentDialogOpen] = useState(false)

  const openContentDialog = (goal: PastGoal) => {
    setSelectedGoal(goal)
    setIsContentDialogOpen(true)
  }

  return (
    <>
      <div className="w-full max-w-full rounded-lg border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <History className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold leading-none tracking-tight text-card-foreground">過去の目標</h3>
            <p className="text-sm text-muted-foreground mt-1.5">完了した目標の履歴</p>
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
                    className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors min-w-[120px]"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-2">
                      目標
                      {getSortIcon("name")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-muted-foreground w-16 sm:w-20 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("weight")}
                  >
                    <div className="flex items-center gap-2">
                      重み
                      {getSortIcon("weight")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-muted-foreground w-32 sm:w-40 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("period")}
                  >
                    <div className="flex items-center gap-2">
                      期間
                      {getSortIcon("period")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-muted-foreground w-20 sm:w-24 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("progress")}
                  >
                    <div className="flex items-center gap-2">
                      達成率
                      {getSortIcon("progress")}
                    </div>
                  </TableHead>
                  <TableHead className="text-muted-foreground w-16 text-center">内容</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentGoals.map((goal) => (
                  <TableRow key={goal.id}>
                    <TableCell className="font-medium text-foreground text-sm min-w-[120px]">{goal.name}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{goal.weight}%</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">{goal.period}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-foreground">{goal.progress}%</span>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 w-full">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">表示件数:</span>
            <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="w-[80px] sm:w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5件</SelectItem>
                <SelectItem value="10">10件</SelectItem>
                <SelectItem value="20">20件</SelectItem>
                <SelectItem value="50">50件</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="h-9 w-9"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </PaginationItem>

              {getPageNumbers().map((page, index) => (
                <PaginationItem key={`${page}-${index}`}>
                  {typeof page === "number" ? (
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                      className={cn(
                        "cursor-pointer",
                        currentPage === page && "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-0",
                      )}
                    >
                      {page}
                    </PaginationLink>
                  ) : (
                    <PaginationEllipsis />
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="h-9 w-9"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
        </div>
      </div>

      <Dialog open={isContentDialogOpen} onOpenChange={setIsContentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedGoal?.name}</DialogTitle>
            <DialogDescription>目標の詳細内容</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
              {selectedGoal?.content || "内容が設定されていません。"}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
