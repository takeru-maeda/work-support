import { PageLayout } from "@/components/layout/PageLayout";
import { EffortForm } from "@/features/effort-entry/components/EffortForm";
import type { JSX } from "react";

export default function EffortsNewPage(): JSX.Element {
  return (
    <PageLayout
      pageTitle="工数登録"
      pageDescription="作業内容と時間の記録"
      className="mb-4 sm:mb-8"
    >
      <EffortForm />
    </PageLayout>
  );
}
