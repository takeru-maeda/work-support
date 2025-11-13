import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterAccordion } from "@/components/filter/FilterAccordion";
import { FilterActionButtons } from "@/components/filter/FilterActionButtons";
import { cn } from "@/lib/utils";
import type { JSX } from "react";

interface EffortsFilterPanelProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  projectValue: string | undefined;
  onProjectChange: (value: string) => void;
  taskValue: string | undefined;
  onTaskChange: (value: string) => void;
  projectOptions: { id: number; name: string }[];
  taskOptions: { id: number; name: string }[];
  onApply: () => void;
  onClear: () => void;
  className?: string;
  allValue?: string;
  allLabel?: string;
}

export function EffortsFilterPanel({
  date,
  onDateChange,
  projectValue,
  onProjectChange,
  taskValue,
  onTaskChange,
  projectOptions,
  taskOptions,
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
          <div className="w-full shrink-0 sm:w-[150px]">
            <DatePicker
              date={date}
              onDateChange={onDateChange}
              placeholder="日付を選択"
            />
          </div>

          <Select value={projectValue} onValueChange={onProjectChange}>
            <SelectTrigger className="w-full sm:flex-1">
              <SelectValue placeholder="案件を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>案件</SelectLabel>
                <SelectItem value={allValue}>{allLabel}</SelectItem>
                {projectOptions.map((project) => (
                  <SelectItem key={project.id} value={String(project.id)}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select value={taskValue} onValueChange={onTaskChange}>
            <SelectTrigger className="w-full sm:flex-1">
              <SelectValue placeholder="タスクを選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>タスク</SelectLabel>
                <SelectItem value={allValue}>{allLabel}</SelectItem>
                {taskOptions.map((task) => (
                  <SelectItem key={task.id} value={String(task.id)}>
                    {task.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <FilterActionButtons onApply={onApply} onClear={onClear} />
      </div>
    </FilterAccordion>
  );
}
