import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";

import { EffortEntries } from "@/features/effort-entry/components/entries";
import { EffortSummary } from "@/features/effort-entry/components/summary/EffortSummary";
import { useEffortFormManager } from "@/features/effort-entry/hooks/useEffortFormManager";
import { Skeleton } from "@/components/ui/skeleton";
import CardContainer from "@/components/shared/CardContainer";
import EffortEntrySkeleton from "./skeleton/EffortEntrySkeleton";
import EffortSummarySkeleton from "./skeleton/EffortSummarySkeleton";

export function EffortForm() {
  const {
    formData,
    projectOptions,
    isProjectLoading,
    isInitializing,
    isSubmitting,
    entryErrors,
    canSubmit,
    hasTotalEstimated,
    setDate,
    setMemo,
    addEntry,
    removeEntry,
    updateEntry,
    handleSubmit,
    projectBreakdown,
    totalEstimated,
    totalActual,
    totalDifference,
    handleReorder,
  } = useEffortFormManager();

  const hasEntries = formData.entries.length > 0;

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">日付</h2>
        {isInitializing ? (
          <DatePicker />
        ) : (
          <DatePicker date={formData.date} onDateChange={setDate} />
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">工数入力</h2>
        {isInitializing ? (
          <EffortEntrySkeleton rows={2} />
        ) : (
          <EffortEntries
            entries={formData.entries}
            projectOptions={projectOptions}
            isProjectLoading={isProjectLoading}
            entryErrors={entryErrors}
            onAdd={addEntry}
            onUpdate={updateEntry}
            onRemove={removeEntry}
            onReorder={handleReorder}
          />
        )}
      </section>

      {isInitializing ? (
        <EffortSummarySkeleton />
      ) : (
        hasEntries && (
          <section className="space-y-2">
            <h2 className="text-xl font-semibold">工数集計</h2>
            <EffortSummary
              projectBreakdown={projectBreakdown}
              totalEstimated={totalEstimated}
              totalActual={totalActual}
              hasTotalEstimated={hasTotalEstimated}
              totalDifference={totalDifference}
            />
          </section>
        )
      )}

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">メモ</h2>
        {isInitializing ? (
          <CardContainer className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-1/2" />
          </CardContainer>
        ) : (
          <Textarea
            placeholder="作業内容や特記事項を入力してください..."
            value={formData.memo}
            onChange={(event) => setMemo(event.target.value)}
            rows={6}
            className="resize-y text-sm h-auto"
          />
        )}
      </section>

      <div className="flex justify-end">
        <Button
          onClick={() => void handleSubmit()}
          size="lg"
          disabled={!canSubmit || isInitializing}
        >
          {isSubmitting ? "送信中..." : "送信"}
        </Button>
      </div>
    </div>
  );
}
