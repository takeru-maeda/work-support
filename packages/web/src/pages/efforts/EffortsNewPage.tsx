import { PageLayout } from "@/components/layout/PageLayout";
import { EffortForm } from "@/features/effort-entry/components/EffortForm";
import type { JSX } from "react";

export default function EffortsNewPage(): JSX.Element {
  return (
    <PageLayout pageTitle="工数登録" pageDescription="作業内容と時間の記録">
      <EffortForm />
    </PageLayout>
  );
}
