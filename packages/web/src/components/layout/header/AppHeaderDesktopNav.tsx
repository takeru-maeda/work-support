import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";
import type { AppHeaderNavLink } from "@/types/navigation";

interface AppHeaderDesktopNavProps {
  navLinks: AppHeaderNavLink[];
  currentPath: string;
}

export function AppHeaderDesktopNav({
  navLinks,
  currentPath,
}: Readonly<AppHeaderDesktopNavProps>) {
  return (
    <nav className="hidden md:flex items-center gap-6">
      {navLinks.map((link) => (
        <Link
          key={link.href}
          to={link.href}
          className={cn(
            "text-sm font-medium transition-colors",
            currentPath === link.href
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
