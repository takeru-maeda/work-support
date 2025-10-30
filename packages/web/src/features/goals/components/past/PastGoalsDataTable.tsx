import { ArrowDown, ArrowUp, ArrowUpDown, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  PastGoal,
  SortDirection,
  SortField,
} from "@/features/goals/types";
import { TableResizeHandle } from "@/components/resizable/TableResizeHandle";
import { useTableResize } from "@/hooks/useTableResize";

interface PastGoalsDataTableProps {
  goals: PastGoal[];
  sortBy: SortField | null;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onViewContent: (goal: PastGoal) => void;
}

export function PastGoalsDataTable({
  goals,
  sortBy,
  sortDirection,
  onSort,
  onViewContent,
}: Readonly<PastGoalsDataTableProps>) {
  const getSortIcon = (field: SortField) => {
    if (sortBy !== field) return <ArrowUpDown className="h-4 w-4" />;
    if (sortDirection === "asc") return <ArrowUp className="h-4 w-4" />;
    return <ArrowDown className="h-4 w-4" />;
  };

  const { tableHeight, isResizing, handleResizeStart } = useTableResize({
    initialHeight: 240,
    minHeight: 240,
    maxHeight: 720,
  });

  return (
    <div className="rounded-lg border border-border">
      <div
        className="custom-scrollbar overflow-x-auto overflow-y-auto [&>[data-slot=table-container]]:overflow-visible"
        style={{ height: `${tableHeight}px` }}
      >
        <Table className="min-w-[500px]">
          <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur supports-[backdrop-filter]:bg-muted/60">
            <TableRow>
              <TableHead
                className="min-w-[120px] cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => onSort("name")}
              >
                <div className="flex items-center gap-2">
                  目標
                  {getSortIcon("name")}
                </div>
              </TableHead>
              <TableHead
                className="w-16 cursor-pointer text-muted-foreground transition-colors hover:text-foreground sm:w-20"
                onClick={() => onSort("weight")}
              >
                <div className="flex items-center gap-2">
                  ウェイト
                  {getSortIcon("weight")}
                </div>
              </TableHead>
              <TableHead
                className="w-32 cursor-pointer text-muted-foreground transition-colors hover:text-foreground sm:w-40"
                onClick={() => onSort("period")}
              >
                <div className="flex items-center gap-2">
                  期間
                  {getSortIcon("period")}
                </div>
              </TableHead>
              <TableHead
                className="w-20 cursor-pointer text-muted-foreground transition-colors hover:text-foreground sm:w-24"
                onClick={() => onSort("progress")}
              >
                <div className="flex items-center gap-2">
                  達成率
                  {getSortIcon("progress")}
                </div>
              </TableHead>
              <TableHead className="w-16 text-center text-muted-foreground">
                内容
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {goals.map((goal) => (
              <TableRow key={goal.id}>
                <TableCell className="min-w-[120px] text-sm font-medium text-foreground">
                  {goal.name}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {goal.weight}%
                  </span>
                </TableCell>
                <TableCell>
                  <span className="whitespace-nowrap text-xs text-muted-foreground sm:text-sm">
                    {goal.period}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {goal.progress}%
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewContent(goal)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <TableResizeHandle
        onResizeStart={handleResizeStart}
        isActive={isResizing}
      />
    </div>
  );
}
