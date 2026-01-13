import { Link, useLocation } from "react-router-dom";

import { MAIN_NAVIGATION } from "@/config/navigation";
import { cn } from "@/lib/utils";

/**
 * モバイル用下部ナビゲーションバーを表示します。
 *
 * スマホアプリのような固定下部ナビゲーションを提供し、
 * 5つの主要機能へのアクセスを容易にします。
 */
export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background pb-3 md:hidden">
      <div className="flex items-center justify-around">
        {MAIN_NAVIGATION.map((item) => {
          const Icon = item.icon;
          const isActive: boolean = location.pathname === item.route;

          return (
            <Link
              key={item.route}
              to={item.route}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-3 min-w-0 flex-1 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0")} />
              <span className="text-xs font-medium truncate w-full text-center">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
