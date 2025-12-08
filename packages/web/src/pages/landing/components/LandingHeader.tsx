import type { JSX } from "react";

import { Link } from "react-router-dom";

import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Button } from "@/components/ui/button";

interface LandingHeaderProps {
  logoHref: string;
  loginHref: string;
  signupHref: string;
}

export const LandingHeader = ({
  logoHref,
  loginHref,
  signupHref,
}: LandingHeaderProps): JSX.Element => (
  <header className="fixed top-0 w-full z-50 border-b bg-background/80 backdrop-blur-xl shadow-lg">
    <div className="container mx-auto px-4 sm:px-6 h-14 flex items-center justify-between max-w-7xl">
      <Link
        to={logoHref}
        className="flex items-center gap-2 sm:gap-2.5 hover:opacity-80 transition-all group"
      >
        <div className="relative">
          <img
            src="/logo.png"
            alt="Work Support"
            width={32}
            height={32}
            className="sm:w-8 sm:h-8 rounded-md shadow-md group-hover:shadow-lg transition-shadow"
          />
          <div className="absolute inset-0 bg-primary/10 rounded-md blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <span className="font-bold text-base sm:text-xl tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text whitespace-nowrap">
          Work Support
        </span>
      </Link>
      <nav className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <Link to={loginHref}>
          <Button
            variant="ghost"
            size="sm"
            className="font-medium hover:bg-muted/80 text-xs sm:text-sm px-2 sm:px-4"
          >
            ログイン
          </Button>
        </Link>
        <Link to={signupHref}>
          <Button
            size="sm"
            className="shadow-lg hover:shadow-2xl transition-all font-medium bg-linear-to-r from-primary via-primary to-primary/90 hover:scale-105 text-xs sm:text-sm px-3 sm:px-4"
          >
            無料で始める
          </Button>
        </Link>
      </nav>
    </div>
  </header>
);

