import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

interface GoalPeriodPickerProps {
  periodStart?: Date;
  periodEnd?: Date;
  onPeriodStartChange: (date?: Date) => void;
  onPeriodEndChange: (date?: Date) => void;
  className?: string;
  disabled?: boolean;
}

export function GoalPeriodPicker({
  periodStart,
  periodEnd,
  onPeriodStartChange,
  onPeriodEndChange,
  className,
  disabled = false,
}: Readonly<GoalPeriodPickerProps>) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center gap-2 text-sm",
        className,
      )}
    >
      <span className="text-muted-foreground mr-auto sm:mr-0">期間:</span>
      <div className="flex items-center gap-2 mr-auto sm:mr-0">
        <DatePicker
          date={periodStart}
          onDateChange={onPeriodStartChange}
          placeholder="開始日"
          disabled={disabled}
        />
        <span className="text-muted-foreground">-</span>
        <DatePicker
          date={periodEnd}
          onDateChange={onPeriodEndChange}
          placeholder="終了日"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
