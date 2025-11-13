import { TableSkeleton } from "./TableSkeleton";
import { Skeleton } from "../ui/skeleton";
import { cn } from "@/lib/utils";

interface TableAndFooterSkeletonProps {
  rows?: number;
  className?: string;
  tableClassName?: string;
}

const TableAndFooterSkeleton = ({
  rows = 4,
  className,
  tableClassName,
}: TableAndFooterSkeletonProps) => {
  return (
    <div className={cn("space-y-6", className)}>
      <TableSkeleton rows={rows} className={tableClassName} />
      <div className="flex">
        <Skeleton className="flex justify-start h-8 w-12" />
        <div className="flex ml-auto gap-3 mr-1">
          <Skeleton className="flex  h-8 w-20" />
          <div className="flex gap-2">
            <Skeleton className="flex  size-8" />
            <Skeleton className="flex  size-8" />
            <Skeleton className="flex  size-8" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableAndFooterSkeleton;
