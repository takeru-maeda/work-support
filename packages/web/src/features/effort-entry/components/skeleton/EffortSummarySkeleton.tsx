import CardContainer from "@/components/shared/CardContainer";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const EffortSummarySkeleton = () => {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold">工数集計</h2>
      <CardContainer className="space-y-6">
        <h3 className="text-sm font-semibold text-muted-foreground">
          案件別集計
        </h3>
        <Skeleton className="h-10 w-full" />
        <div className="border-t" />
        <div className="space-y-2">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
            全体合計
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">見積合計</Label>
              <Skeleton className="h-8 w-20" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">実績合計</Label>
              <Skeleton className="h-8 w-20" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">差分</Label>
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </div>
      </CardContainer>
    </section>
  );
};

export default EffortSummarySkeleton;
