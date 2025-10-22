import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { ja } from "date-fns/locale";

import { WeeklyReportControls } from "@/features/reports/components/weekly-report/WeeklyReportControls";
import { WeeklyReportPreview } from "@/features/reports/components/weekly-report/WeeklyReportPreview";
import { SectionHeader } from "@/components/sections/SectionHeader";
import { FileText } from "lucide-react";

export function WeeklyReport() {
  const [date, setDate] = useState<Date>(new Date());
  const [copied, setCopied] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });

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

以上`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateReportText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleOutput = () => {
    setShowReport(true);
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <SectionHeader
          icon={FileText}
          iconClassName="bg-chart-3/10 text-chart-3"
          title="週報出力"
          description="週報の雛形を出力します"
        />
        <WeeklyReportControls
          date={date}
          weekStart={weekStart}
          weekEnd={weekEnd}
          onDateChange={(next) => setDate(next)}
          onOutput={handleOutput}
        />
      </CardHeader>

      {showReport && (
        <WeeklyReportPreview
          reportText={generateReportText()}
          copied={copied}
          onCopy={handleCopy}
        />
      )}
    </Card>
  );
}
