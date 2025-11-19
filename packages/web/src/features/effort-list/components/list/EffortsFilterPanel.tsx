import { DatePicker } from "@/components/ui/date-picker";
import { FilterAccordion } from "@/components/filter/FilterAccordion";
import { FilterActionButtons } from "@/components/filter/FilterActionButtons";
import { cn } from "@/lib/utils";
import { CommandFilterSelect } from "@/features/effort-list/components/list/CommandFilterSelect";
import type { JSX } from "react";

interface EffortsFilterPanelProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  projectValue: string | undefined;
  onProjectChange: (value: string) => void;
  taskValue: string | undefined;
  onTaskChange: (value: string) => void;
  projectOptions: { id: number; name: string }[];
  taskOptions: { id: number; name: string }[];
  isProjectLoading?: boolean;
  isTaskLoading?: boolean;
  onApply: () => void;
  onClear: () => void;
  className?: string;
  allValue?: string;
  allLabel?: string;
}

export function EffortsFilterPanel({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  projectValue,
  onProjectChange,
  taskValue,
  onTaskChange,
  projectOptions,
  taskOptions,
  isProjectLoading = false,
  isTaskLoading = false,
  onApply,
  onClear,
  className,
  allValue = "__all__",
  allLabel = "すべて",
}: Readonly<EffortsFilterPanelProps>): JSX.Element {
  return (
    <FilterAccordion
      className={cn("mb-4 sm:mb-6", className)}
      triggerClassName="px-4 hover:no-underline"
      contentClassName="px-4 pb-4"
    >
      <div className="space-y-3 pt-2">
        <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row">
          <div className="flex items-center space-x-2 sm:space-x-2">
            <DatePicker
              date={startDate}
              onDateChange={onStartDateChange}
              placeholder="開始日"
            />
            <DatePicker
              date={endDate}
              onDateChange={onEndDateChange}
              placeholder="終了日"
            />
          </div>

          <CommandFilterSelect
            placeholder="案件を選択"
            value={projectValue}
            onChange={onProjectChange}
            options={projectOptions}
            allValue={allValue}
            allLabel={allLabel}
            isLoading={isProjectLoading}
          />

          <CommandFilterSelect
            placeholder="タスクを選択"
            value={taskValue}
            onChange={onTaskChange}
            options={taskOptions}
            allValue={allValue}
            allLabel={allLabel}
            isLoading={isTaskLoading}
          />
        </div>

        <FilterActionButtons onApply={onApply} onClear={onClear} />
      </div>
    </FilterAccordion>
  );
}
