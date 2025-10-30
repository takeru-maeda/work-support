import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  EffortListEntry,
  EffortSortColumn,
  EffortSortDirection,
} from "@/features/effort-list/types";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JSX } from "react";

interface EffortsTableProps {
  entries: EffortListEntry[];
  sortColumn: EffortSortColumn | null;
  sortDirection: EffortSortDirection;
  onSort: (column: EffortSortColumn) => void;
  className?: string;
  hasActiveFilters?: boolean;
  emptyMessage?: string;
  emptyFilteredMessage?: string;
}

const HEADERS: Array<{
  key: EffortSortColumn;
  label: string;
  align?: "left" | "right";
  minWidth?: string;
}> = [
  { key: "date", label: "日付", minWidth: "min-w-[120px]" },
  { key: "project", label: "案件", minWidth: "min-w-[150px]" },
  { key: "task", label: "タスク", minWidth: "min-w-[150px]" },
  { key: "estimatedHours", label: "見積(h)", align: "right", minWidth: "min-w-[120px]" },
  { key: "actualHours", label: "実績(h)", align: "right", minWidth: "min-w-[120px]" },
  { key: "difference", label: "差分(h)", align: "right", minWidth: "min-w-[120px]" },
];

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

const renderSortIcon = (
  column: EffortSortColumn,
  activeColumn: EffortSortColumn | null,
  direction: EffortSortDirection,
) => {
  if (activeColumn !== column || !direction) {
    return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground" />;
  }

  if (direction === "asc") {
    return <ArrowUp className="ml-2 h-4 w-4 text-muted-foreground" />;
  }

  return <ArrowDown className="ml-2 h-4 w-4 text-muted-foreground" />;
};

export function EffortsTable({
  entries,
  sortColumn,
  sortDirection,
  onSort,
  className,
  hasActiveFilters = false,
  emptyMessage = "工数データがありません",
  emptyFilteredMessage = "条件に一致する工数データがありません",
}: Readonly<EffortsTableProps>): JSX.Element {
  return (
    <Table className={className}>
      <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur supports-[backdrop-filter]:bg-muted/60">
        <TableRow>
          {HEADERS.map(({ key, label, align = "left", minWidth }) => (
            <TableHead
              key={key}
              className={cn(
                "select-none text-muted-foreground transition-colors hover:text-foreground",
                align === "right" ? "text-right" : "",
                minWidth,
                "cursor-pointer",
              )}
            >
              <Button
                variant="ghost"
                onClick={() => onSort(key)}
                className={cn(
                  "h-8 w-full justify-start px-2 hover:bg-muted/50",
                  align === "right" ? "justify-end" : "justify-start",
                )}
              >
                <span>{label}</span>
                {renderSortIcon(key, sortColumn, sortDirection)}
              </Button>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>

      <TableBody>
        {entries.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={HEADERS.length}
              className="py-8 text-center text-muted-foreground"
            >
              {hasActiveFilters ? emptyFilteredMessage : emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          entries.map((entry) => {
            const difference = entry.actualHours - entry.estimatedHours;
            const differenceClass =
              difference > 0
                ? "text-destructive"
                : difference < 0
                  ? "text-green-600 dark:text-green-400"
                  : "";

            return (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">
                  {formatDate(entry.date)}
                </TableCell>
                <TableCell>{entry.project}</TableCell>
                <TableCell>{entry.task}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {entry.estimatedHours.toFixed(1)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {entry.actualHours.toFixed(1)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <span className={differenceClass}>
                    {difference > 0 ? "+" : ""}
                    {difference.toFixed(1)}
                  </span>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
