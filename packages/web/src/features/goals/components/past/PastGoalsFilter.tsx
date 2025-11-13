import { Input } from "@/components/ui/input";
import { GoalPeriodPicker } from "@/features/goals/components/shared/GoalPeriodPicker";
import type { JSX } from "react";
import { FilterAccordion } from "@/components/filter/FilterAccordion";
import { FilterActionButtons } from "@/components/filter/FilterActionButtons";

interface PastGoalsFilterProps {
  titleValue: string;
  onTitleChange: (value: string) => void;
  startDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  endDate: Date | undefined;
  onEndDateChange: (date: Date | undefined) => void;
  progressMinValue: string;
  onProgressMinChange: (value: string) => void;
  progressMaxValue: string;
  onProgressMaxChange: (value: string) => void;
  onApply: () => void;
  onClear: () => void;
  className?: string;
}

export function PastGoalsFilter({
  titleValue,
  onTitleChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  progressMinValue,
  onProgressMinChange,
  progressMaxValue,
  onProgressMaxChange,
  onApply,
  onClear,
  className,
}: Readonly<PastGoalsFilterProps>): JSX.Element {
  return (
    <FilterAccordion
      className={className}
      title="絞り込み条件"
      triggerClassName="px-4 hover:no-underline"
      contentClassName="px-4 pb-4"
    >
      <div className="space-y-2 sm:space-y-3 pt-2">
        <div className="w-full">
          <Input
            placeholder="目標で絞り込み"
            value={titleValue}
            onChange={(event) => onTitleChange(event.target.value)}
            className="w-full text-sm"
          />
        </div>
        <GoalPeriodPicker
          periodStart={startDate}
          periodEnd={endDate}
          onPeriodStartChange={onStartDateChange}
          onPeriodEndChange={onEndDateChange}
          className="flex-1"
        />
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            達成率:
          </span>
          <div className="flex items-center gap-2 flex-1">
            <Input
              type="number"
              placeholder="0"
              min="0"
              max="100"
              value={progressMinValue}
              onChange={(event) => onProgressMinChange(event.target.value)}
              className="w-20 sm:w-24 text-sm"
            />
            <span className="text-sm text-muted-foreground">%</span>
            <span className="text-sm text-muted-foreground">〜</span>
            <Input
              type="number"
              placeholder="100"
              min="0"
              max="100"
              value={progressMaxValue}
              onChange={(event) => onProgressMaxChange(event.target.value)}
              className="w-20 sm:w-24 text-sm"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>
        <FilterActionButtons onApply={onApply} onClear={onClear} />
      </div>
    </FilterAccordion>
  );
}
