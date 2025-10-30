import { CalendarIcon, FileText } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface WeeklyReportControlsProps {
  date: Date;
  weekStart: Date;
  weekEnd: Date;
  loading?: boolean;
  onDateChange: (date: Date) => void;
  onOutput: () => void;
  className?: string;
}

export function WeeklyReportControls({
  date,
  weekStart,
  weekEnd,
  onDateChange,
  onOutput,
  className,
}: Readonly<WeeklyReportControlsProps>) {
  return (
    <div className={cn("flex gap-3", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="flex-1 justify-start bg-background text-left font-normal"
          >
            <CalendarIcon className="mr-1 h-4 w-4" />
            {format(weekStart, "yyyy/MM/dd", { locale: ja })} -{" "}
            {format(weekEnd, "yyyy/MM/dd", { locale: ja })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            captionLayout="dropdown-months"
            selected={date}
            onSelect={(selected) => selected && onDateChange(selected)}
          />
        </PopoverContent>
      </Popover>

      <Button onClick={onOutput} className="whitespace-nowrap">
        <FileText className="mr-2 h-4 w-4" />
        出力
      </Button>
    </div>
  );
}
