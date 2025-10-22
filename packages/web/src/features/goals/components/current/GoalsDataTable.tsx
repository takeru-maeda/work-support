import { Eye, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  Goal,
  GoalSortField,
  SortDirection,
} from "@/features/goals/types";

interface GoalsDataTableProps {
  goals: Goal[];
  sortField: GoalSortField;
  sortDirection: SortDirection;
  onSort: (field: GoalSortField) => void;
  onNameChange: (id: string, value: string) => void;
  onWeightChange: (id: string, value: number) => void;
  onProgressChange: (id: string, value: number) => void;
  onRemove: (id: string) => void;
  onViewContent: (goal: Goal) => void;
}

export function GoalsDataTable({
  goals,
  sortField,
  sortDirection,
  onSort,
  onNameChange,
  onWeightChange,
  onProgressChange,
  onRemove,
  onViewContent,
}: Readonly<GoalsDataTableProps>) {
  const getSortIcon = (field: GoalSortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground/50" />;
    }

    if (sortDirection === "asc") {
      return <ArrowUp className="ml-1 h-4 w-4 text-foreground" />;
    }

    return <ArrowDown className="ml-1 h-4 w-4 text-foreground" />;
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="overflow-x-auto">
        <Table className="min-w-[500px]">
          <TableHeader className="sticky top-0 z-10 bg-muted/50">
            <TableRow>
              <TableHead
                className="min-w-[120px] cursor-pointer select-none text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => onSort("name")}
              >
                <div className="flex items-center">
                  目標
                  {getSortIcon("name")}
                </div>
              </TableHead>
              <TableHead
                className="w-20 cursor-pointer select-none text-muted-foreground transition-colors hover:text-foreground sm:w-24"
                onClick={() => onSort("weight")}
              >
                <div className="flex items-center">
                  ウェイト
                  {getSortIcon("weight")}
                </div>
              </TableHead>
              <TableHead
                className="w-24 cursor-pointer select-none text-muted-foreground transition-colors hover:text-foreground sm:w-32"
                onClick={() => onSort("progress")}
              >
                <div className="flex items-center">
                  進捗
                  {getSortIcon("progress")}
                </div>
              </TableHead>
              <TableHead className="w-16 text-center text-muted-foreground">
                内容
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {goals.map((goal) => (
              <TableRow key={goal.id}>
                <TableCell className="min-w-[120px]">
                  <Input
                    value={goal.name}
                    onChange={(event) =>
                      onNameChange(goal.id, event.target.value)
                    }
                    className="min-w-90 h-8 border-0 text-sm focus-visible:ring-1 focus-visible:ring-ring shadow-none"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={goal.weight}
                      onChange={(event) =>
                        onWeightChange(
                          goal.id,
                          Number.parseInt(event.target.value) || 0,
                        )
                      }
                      className="h-8 w-16 text-center text-sm"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={goal.progress}
                      onChange={(event) =>
                        onProgressChange(
                          goal.id,
                          Number.parseInt(event.target.value) || 0,
                        )
                      }
                      className="h-8 w-16 text-center text-sm"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
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
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(goal.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
