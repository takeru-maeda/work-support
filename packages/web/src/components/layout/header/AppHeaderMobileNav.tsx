import type { Dispatch, SetStateAction } from "react";

import { Link } from "react-router-dom";

import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { AppHeaderNavLink } from "@/types/navigation";

interface AppHeaderMobileNavProps {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  navLinks: AppHeaderNavLink[];
  currentPath: string;
  onLinkClick?: () => void;
}

export function AppHeaderMobileNav({
  open,
  onOpenChange,
  navLinks,
  currentPath,
  onLinkClick,
}: Readonly<AppHeaderMobileNavProps>) {
  const handleLinkClick = () => {
    onLinkClick?.();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">メニューを開く</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[240px] sm:w-[300px]">
        <nav className="flex flex-col gap-4 mt-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={handleLinkClick}
              className={cn(
                "text-base font-medium transition-colors py-2 px-4 rounded-md",
                currentPath === link.href
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
