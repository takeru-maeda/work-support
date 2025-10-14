import { Clock, FileText, Target } from "lucide-react";

import { ROUTES } from "@/config/routes";
import type { AuthUser } from "@/lib/auth";
import { useUserStore } from "@/store/user";
import { HomeFeatureCard } from "@/pages/home/components/HomeFeatureCard";

export default function HomePage() {
  const user: AuthUser | null = useUserStore((state) => state.user);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-16">
        <header className="mb-12 text-center">
          <h1 className="text-balance text-5xl font-bold text-foreground mb-4">
            Work Support
          </h1>
          <p className="text-xl text-muted-foreground">
            {user?.name ? `ようこそ、${user.name}さん` : "ようこそ"}
          </p>
        </header>

        <div className="mx-auto grid max-w-5xl gap-3 sm:gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
          <HomeFeatureCard
            to={ROUTES.effort}
            icon={Clock}
            title="工数登録"
            description="日々の作業時間を記録・管理"
          />
          <HomeFeatureCard
            to={ROUTES.goals}
            icon={Target}
            title="目標管理"
            description="目標設定と進捗管理"
          />
          <HomeFeatureCard
            to={ROUTES.weeklyReport}
            icon={FileText}
            title="週報出力"
            description="週次レポートの作成"
          />
        </div>
      </div>
    </div>
  );
}
