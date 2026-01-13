import { ROUTES } from "@/config/routes";
import { MAIN_NAVIGATION } from "@/config/navigation";
import type { AuthUser } from "@/lib/auth";
import { useUserStore } from "@/store/user";
import { HomeFeatureCard } from "@/pages/home/components/HomeFeatureCard";

export default function HomePage() {
  const user: AuthUser | null = useUserStore((state) => state.user);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-16">
        <header className="mb-8 sm:mb-12 text-center">
          <h1 className="text-balance text-4xl sm:text-5xl font-bold text-foreground mb-4">
            Work Support
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground">
            {user?.name ? `ようこそ、${user.name}さん` : "ようこそ"}
          </p>
        </header>

        <div className="mx-auto grid grid-cols-2 max-w-5xl gap-3 sm:gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
          {MAIN_NAVIGATION.filter((item) => item.route !== ROUTES.home).map(
            (item) => (
              <HomeFeatureCard
                key={item.route}
                to={item.route}
                icon={item.icon}
                title={item.label}
                description={item.description}
              />
            ),
          )}
        </div>
      </div>
    </div>
  );
}
