"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";

import { EffortEntries } from "@/features/effort/components/entries";
import { EffortSummary } from "@/features/effort/components/summary/EffortSummary";
import { useEffortFormManager } from "@/features/effort/hooks/useEffortFormManager";

export function EffortForm() {
  const {
    formData,
    setDate,
    setMemo,
    addEntry,
    removeEntry,
    updateEntry,
    handleSubmit,
    projectBreakdown,
    totalEstimated,
    totalActual,
    draggedIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = useEffortFormManager();

  const hasEntries = formData.entries.length > 0;

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">日付</h2>
        <DatePicker date={formData.date} onDateChange={setDate} />
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">工数入力</h2>
        <div className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm">
          <EffortEntries
            entries={formData.entries}
            draggedIndex={draggedIndex}
            onAdd={addEntry}
            onUpdate={updateEntry}
            onRemove={removeEntry}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          />
        </div>
      </section>

      {hasEntries && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">工数集計</h2>
          <EffortSummary
            projectBreakdown={projectBreakdown}
            totalEstimated={totalEstimated}
            totalActual={totalActual}
          />
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">メモ</h2>
        <Textarea
          placeholder="作業内容や特記事項を入力してください..."
          value={formData.memo}
          onChange={(event) => setMemo(event.target.value)}
          rows={6}
          className="resize-y"
        />
      </section>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} size="lg" disabled={!hasEntries}>
          送信
        </Button>
      </div>
    </div>
  );
}
