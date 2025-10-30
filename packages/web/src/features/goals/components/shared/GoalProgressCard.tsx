import type { LucideIcon } from "lucide-react";

interface GoalProgressCardProps {
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  value: number;
  diff: number;
}

const formatProgressDiff = (diff: number) => {
  const sign = diff >= 0 ? "+" : "";
  return `${sign}${diff.toFixed(1)}%`;
};

const getProgressDiffClass = (diff: number) => {
  if (diff > 0) return "text-green-600 dark:text-green-400";
  if (diff < 0) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
};

export function GoalProgressCard({
  icon: Icon,
  iconClassName,
  title,
  value,
  diff,
}: Readonly<GoalProgressCardProps>) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <div className={`rounded-md p-1.5 ${iconClassName}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          {title}
        </span>
      </div>
      <div className="space-y-3">
        <div className="flex items-baseline gap-1 sm:gap-2">
          <div className="text-2xl font-bold text-foreground tabular-nums sm:text-4xl">
            {value.toFixed(1)}
            <span className="ml-1 text-lg text-muted-foreground sm:text-3xl">
              %
            </span>
          </div>
          <span
            className={`text-xs sm:text-lg font-semibold ${getProgressDiffClass(diff)}`}
          >
            {formatProgressDiff(diff)}
          </span>
        </div>
      </div>
    </div>
  );
}
