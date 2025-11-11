import CardContainer from "@/components/shared/CardContainer";
import { Label } from "@/components/ui/label";

import type { ProjectBreakdownItem } from "@/features/effort-entry/types";
import { formatWorkHours } from "@/features/effort-entry/utils/formatHours";
import DifferenceLabel from "../entries/DifferenceLabel";

interface EffortSummaryProps {
  projectBreakdown: ProjectBreakdownItem[];
  totalEstimated: number;
  totalActual: number;
  hasTotalEstimated: boolean;
  totalDifference: number;
}

export function EffortSummary({
  projectBreakdown,
  totalEstimated,
  totalActual,
  hasTotalEstimated,
  totalDifference,
}: Readonly<EffortSummaryProps>) {
  const normalizedDifference: number | null = hasTotalEstimated
    ? totalDifference
    : null;

  return (
    <CardContainer>
      <div className="space-y-6">
        {projectBreakdown.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">
              案件別集計
            </h3>
            <div className="space-y-3">
              {projectBreakdown.map((project) => (
                <div
                  key={`${project.projectId ?? "new"}-${project.projectName}`}
                  className="flex flex-col gap-3 rounded-md bg-muted/50 p-3 sm:grid sm:grid-cols-4"
                >
                  <div className="sm:col-span-1 truncate font-medium text-sm">
                    {project.projectName}
                  </div>
                  <div className="flex gap-3 sm:contents">
                    <div className="flex flex-1 items-center gap-2 sm:flex-none">
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        見積:
                      </span>
                      <span className="font-semibold">
                        {project.hasEstimated
                          ? `${formatWorkHours(project.estimated)}h`
                          : "-"}
                      </span>
                    </div>
                    <div className="flex flex-1 items-center gap-2 sm:flex-none">
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        実績:
                      </span>
                      <span className="font-semibold">
                        {`${formatWorkHours(project.actual)}h`}
                      </span>
                    </div>
                    <div className="flex flex-1 items-center gap-2 sm:flex-none">
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        差分:
                      </span>
                      <DifferenceLabel difference={project.hasEstimated ? project.difference : null} />
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
              <Label className="text-muted-foreground">見積合計</Label>
              <p className="text-lg sm:text-2xl font-bold">
                {hasTotalEstimated
                  ? `${formatWorkHours(totalEstimated)}h`
                  : "-"}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">実績合計</Label>
              <p className="text-lg sm:text-2xl font-bold">
                {`${formatWorkHours(totalActual)}h`}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">差分</Label>
              <div className="flex items-center gap-2">
                <DifferenceLabel
                  difference={normalizedDifference}
                  commonStyle="text-lg sm:text-2xl "
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </CardContainer>
  );
}
