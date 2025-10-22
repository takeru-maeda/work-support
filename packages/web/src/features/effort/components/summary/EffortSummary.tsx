import { Label } from "@/components/ui/label";

import { DifferenceBadge } from "@/features/effort/components/entries/DifferenceBadge";
import type { ProjectBreakdownItem } from "../../types";

interface EffortSummaryProps {
  projectBreakdown: ProjectBreakdownItem[];
  totalEstimated: number;
  totalActual: number;
}

export function EffortSummary({
  projectBreakdown,
  totalEstimated,
  totalActual,
}: Readonly<EffortSummaryProps>) {
  const totalDifference = totalActual - totalEstimated;

  return (
    <div className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm">
      <div className="space-y-6">
        {projectBreakdown.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">
              案件別集計
            </h3>
            <div className="space-y-3">
              {projectBreakdown.map((project) => (
                <div
                  key={project.project}
                  className="flex flex-col gap-3 rounded-md bg-muted/50 p-3 sm:grid sm:grid-cols-4"
                >
                  <div className="sm:col-span-1 truncate font-medium">
                    {project.project}
                  </div>
                  <div className="flex gap-3 sm:contents">
                    <div className="flex flex-1 items-center gap-2 sm:flex-none">
                      <span className="text-sm text-muted-foreground">
                        見積:
                      </span>
                      <span className="font-semibold">
                        {project.estimated.toFixed(1)}h
                      </span>
                    </div>
                    <div className="flex flex-1 items-center gap-2 sm:flex-none">
                      <span className="text-sm text-muted-foreground">
                        実績:
                      </span>
                      <span className="font-semibold">
                        {project.actual.toFixed(1)}h
                      </span>
                    </div>
                    <div className="flex flex-1 items-center gap-2 sm:flex-none">
                      <span className="text-sm text-muted-foreground">
                        差分:
                      </span>
                      <span className="font-semibold">
                        {project.difference.toFixed(1)}h
                      </span>
                      <DifferenceBadge difference={project.difference} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {projectBreakdown.length > 0 && <div className="border-t" />}

        <div>
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
            全体合計
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">見積もり合計</Label>
              <p className="text-2xl font-bold">{totalEstimated.toFixed(1)}h</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">実績合計</Label>
              <p className="text-2xl font-bold">{totalActual.toFixed(1)}h</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">差分</Label>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">
                  {totalDifference.toFixed(1)}h
                </p>
                <DifferenceBadge difference={totalDifference} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
