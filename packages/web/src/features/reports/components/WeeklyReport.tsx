"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarIcon, FileText, Copy, Check } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, startOfWeek, endOfWeek } from "date-fns"
import { ja } from "date-fns/locale"

export function WeeklyReport() {
  const [date, setDate] = useState<Date>(new Date())
  const [copied, setCopied] = useState(false)
  const [showReport, setShowReport] = useState(false)

  const weekStart = startOfWeek(date, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 })

  const generateReportText = () => {
    return `週報
期間: ${format(weekStart, "yyyy年M月d日", { locale: ja })} - ${format(weekEnd, "yyyy年M月d日", { locale: ja })}

■ 今週の活動内容
・プロジェクトAの設計レビューを完了
・バグ修正を15件対応
・チームメンバー向けの技術勉強会を実施

■ 進捗状況
・タスク完了数: 24件
・作業時間: 42時間
・会議参加: 8回
・コードレビュー: 12件

■ 課題・問題点
・統合テスト環境の不具合により、テストが遅延
・ドキュメント作成のリソースが不足

■ 来週の予定
・ベータテストフェーズの開始
・API仕様書の完成
・チーム振り返りミーティングの実施

以上`
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateReportText())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const handleOutput = () => {
    setShowReport(true)
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-chart-3/10">
              <FileText className="h-5 w-5 text-chart-3" />
            </div>
            <div>
              <CardTitle className="text-card-foreground">週報出力</CardTitle>
              <CardDescription>週報の雛形を出力します</CardDescription>
            </div>
          </div>
        </div>

        {/* Date Picker */}
        <div className="pt-4 flex gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex-1 justify-start text-left font-normal bg-background">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(weekStart, "M月d日", { locale: ja })} - {format(weekEnd, "M月d日, yyyy年", { locale: ja })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} />
            </PopoverContent>
          </Popover>

          <Button onClick={handleOutput} className="whitespace-nowrap">
            <FileText className="mr-2 h-4 w-4" />
            出力
          </Button>
        </div>
      </CardHeader>

      {showReport && (
        <CardContent className="space-y-4">
          <div className="relative">
            <div className="absolute right-2 top-2 z-10">
              <Button size="sm" variant="ghost" onClick={handleCopy} className="h-8 gap-2 bg-muted/50 hover:bg-muted">
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    コピー済み
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    コピー
                  </>
                )}
              </Button>
            </div>
            <div className="rounded-lg bg-muted/30 border border-border p-4 font-mono text-sm overflow-auto max-h-[600px]">
              <pre className="text-foreground whitespace-pre-wrap leading-relaxed">{generateReportText()}</pre>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
