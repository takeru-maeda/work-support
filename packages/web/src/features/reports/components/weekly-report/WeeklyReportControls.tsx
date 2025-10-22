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

interface WeeklyReportControlsProps {
  date: Date;
  weekStart: Date;
  weekEnd: Date;
  loading?: boolean;
  onDateChange: (date: Date) => void;
  onOutput: () => void;
}

export function WeeklyReportControls({
  date,
  weekStart,
  weekEnd,
  onDateChange,
  onOutput,
}: Readonly<WeeklyReportControlsProps>) {
  return (
    <div className="flex gap-3 pt-4">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="flex-1 justify-start bg-background text-left font-normal"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(weekStart, "M月d日", { locale: ja })} - {" "}
            {format(weekEnd, "M月d日, yyyy年", { locale: ja })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
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
