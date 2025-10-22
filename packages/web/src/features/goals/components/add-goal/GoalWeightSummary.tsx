interface GoalWeightSummaryProps {
  totalWeight: number;
  isExceeded: boolean;
}

export function GoalWeightSummary({
  totalWeight,
  isExceeded,
}: Readonly<GoalWeightSummaryProps>) {
  const statusClass = isExceeded
    ? "text-destructive"
    : totalWeight === 100
      ? "text-primary"
      : "text-muted-foreground";

  return (
    <div className="mb-6 flex items-center justify-between rounded-lg border border-border bg-card p-4">
      <span className="text-sm font-medium text-muted-foreground">
        トータルウェイト
      </span>
      <div className="flex items-center gap-2">
        <span className={`text-2xl font-bold ${statusClass}`}>
          {totalWeight}%
        </span>
        <span className="text-sm text-muted-foreground">/ 100%</span>
      </div>
    </div>
  );
}
