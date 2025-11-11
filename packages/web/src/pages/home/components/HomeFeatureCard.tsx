import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface HomeFeatureCardProps {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export function HomeFeatureCard({
  to,
  icon: Icon,
  title,
  description,
  className,
}: Readonly<HomeFeatureCardProps>) {
  return (
    <Link to={to} className="h-full">
      <Card
        className={cn(
          "p-8 h-full cursor-pointer transition-all hover:border-primary group",
          className,
        )}
      >
        <div className="flex flex-col items-center text-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
              {title}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
