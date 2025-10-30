import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TableSkeletonProps {
  className?: string;
}

export function TableSkeleton({ className }: Readonly<TableSkeletonProps>) {
  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
