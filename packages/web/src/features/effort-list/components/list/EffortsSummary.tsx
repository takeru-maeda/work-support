import type { EffortListEntry } from "@/features/effort-list/types";
import type { JSX } from "react";
import { cn } from "@/lib/utils";
import { formatWorkHours } from "@/features/effort-entry/utils/formatHours";

interface EffortsSummaryProps {
  entries: EffortListEntry[];
  className?: string;
}

export function EffortsSummary({
  entries,
  className,
}: Readonly<EffortsSummaryProps>): JSX.Element {
  const totals = calculateTotals(entries);
  const differenceClass = !totals.hasEstimated
    ? "text-primary"
    : totals.difference > 0
      ? "text-destructive-foreground"
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
            {totals.hasEstimated
              ? `${formatWorkHours(totals.estimated)}h`
              : "-"}
          </p>
        </div>
        <div>
          <p className="mb-1 text-sm text-muted-foreground">実績合計</p>
          <p className="text-xl sm:text-2xl font-bold tabular-nums">
            {formatWorkHours(totals.actual)}h
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
            {totals.hasEstimated
              ? `${totals.difference > 0 ? "+" : ""}${formatWorkHours(totals.difference)}h`
              : "-"}
          </p>
        </div>
      </div>
    </div>
  );
}

function calculateTotals(entries: EffortListEntry[]): {
  estimated: number;
  actual: number;
  difference: number;
  hasEstimated: boolean;
} {
  return entries.reduce(
    (acc, entry) => {
      if (entry.estimatedHours != null) {
        acc.estimated += entry.estimatedHours;
        acc.hasEstimated = true;
        acc.difference += entry.actualHours - entry.estimatedHours;
      } else {
        acc.difference += entry.actualHours;
      }
      acc.actual += entry.actualHours;
      return acc;
    },
    { estimated: 0, actual: 0, difference: 0, hasEstimated: false } as {
      estimated: number;
      actual: number;
      difference: number;
      hasEstimated: boolean;
    },
  );
}
