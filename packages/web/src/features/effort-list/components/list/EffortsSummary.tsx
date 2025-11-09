import type { EffortListEntry } from "@/features/effort-list/types";
import type { JSX } from "react";
import { cn } from "@/lib/utils";

interface EffortsSummaryProps {
  entries: EffortListEntry[];
  className?: string;
}

const calculateTotals = (entries: EffortListEntry[]) => {
  return entries.reduce(
    (acc, entry) => {
      acc.estimated += entry.estimatedHours;
      acc.actual += entry.actualHours;
      acc.difference += entry.actualHours - entry.estimatedHours;
      return acc;
    },
    { estimated: 0, actual: 0, difference: 0 },
  );
};

export function EffortsSummary({
  entries,
  className,
}: Readonly<EffortsSummaryProps>): JSX.Element {
  const totals = calculateTotals(entries);
  const differenceClass =
    totals.difference > 0
      ? "text-destructive"
      : totals.difference < 0
        ? "text-green-600 dark:text-green-400"
        : "";

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/30 p-4",
        className,
      )}
    >
      <div className="grid gap-4 grid-cols-3">
        <div>
          <p className="mb-1 text-sm text-muted-foreground">見積合計</p>
          <p className="text-xl sm:text-2xl font-bold tabular-nums">
            {totals.estimated.toFixed(1)}h
          </p>
        </div>
        <div>
          <p className="mb-1 text-sm text-muted-foreground">実績合計</p>
          <p className="text-xl sm:text-2xl font-bold tabular-nums">
            {totals.actual.toFixed(1)}h
          </p>
        </div>
        <div>
          <p className="mb-1 text-sm text-muted-foreground">差分合計</p>
          <p
            className={cn(
              "text-xl sm:text-2xl font-bold tabular-nums",
              differenceClass,
            )}
          >
            {totals.difference > 0 ? "+" : ""}
            {totals.difference.toFixed(1)}h
          </p>
        </div>
      </div>
    </div>
  );
}
