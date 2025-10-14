import { Link } from "react-router-dom";

import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Command } from "lucide-react";

interface AppHeaderHomeLinkProps {
  className?: string;
}

export function AppHeaderHomeLink({
  className,
}: Readonly<AppHeaderHomeLinkProps>) {
  return (
    <Link
      to={ROUTES.home}
      className={cn(
        "flex items-center gap-2 hover:opacity-80 transition-opacity",
        className,
      )}
    >
      <div className="relative h-9 w-9">
        <Avatar className="rounded-md size-9">
          <AvatarImage src="/logo.png" />
          <AvatarFallback className="rounded-md">
            <Command />
          </AvatarFallback>
        </Avatar>
      </div>
      <span className="text-xl font-bold text-foreground">Work Support</span>
    </Link>
  );
}
