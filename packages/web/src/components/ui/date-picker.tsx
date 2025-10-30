"use client";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  placeholder?: string;
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "日付を選択",
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[130px] justify-start text-left font-normal h-8 text-sm",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="h-4 w-4" />
          {date ? (
            format(date, "yyyy/MM/dd", { locale: ja })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          initialFocus
          captionLayout="dropdown-months"
        />
      </PopoverContent>
    </Popover>
  );
}
