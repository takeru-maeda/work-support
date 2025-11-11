import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "../shared/PageContainer";
import { CardSkeleton } from "./CardSkeleton";
import TableAndFooterSkeleton from "./TableAndFooterSkeleton";
import CardContainer from "../shared/CardContainer";

export function ContentsAreaSkeleton() {
  return (
    <PageContainer>
      {/* タイトル */}
      <div className="space-y-2 mb-6 sm:mb-8">
        <Skeleton className="h-11 sm:h-12 w-48" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>

      <CardSkeleton className="mb-4 shadow-sm" />

      <CardContainer className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="size-10" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-2 sm:gap-6">
            {[1, 2].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>

          <TableAndFooterSkeleton />
        </div>
      </CardContainer>
    </PageContainer>
  );
}
