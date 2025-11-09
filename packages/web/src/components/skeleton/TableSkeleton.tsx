import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TableSkeletonProps {
  rows?: number;
  className?: string;
}

export function TableSkeleton({
  rows = 4,
  className,
}: Readonly<TableSkeletonProps>) {
  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      <div className="p-5 space-y-4">
        <Skeleton className="h-8 w-full" />
        <div className="space-y-3">
          {Array.from({ length: rows }, (_, i) => i).map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-full" />
              </div>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-10" />
              <Skeleton className="h-8 w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
