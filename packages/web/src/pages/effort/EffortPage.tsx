import { PageLayout } from "@/components/layout/PageLayout";
import { EffortForm } from "@/features/effort/components/EffortForm";

export default function EffortPage() {
  return (
    <PageLayout pageTitle="工数登録" pageDescription="作業時間の記録と管理">
      <EffortForm />
    </PageLayout>
  );
}
