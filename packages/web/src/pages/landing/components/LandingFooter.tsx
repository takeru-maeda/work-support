import type { JSX } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";

export const LandingFooter = (): JSX.Element => (
  <footer className="py-12 sm:py-16 px-4 border-t border-border/50 bg-linear-to-b from-muted/30 to-muted/50 relative overflow-hidden">
    {/* Background blur */}
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] rounded-full bg-primary/5 blur-[100px]" />

    <div className="container mx-auto max-w-6xl relative z-10">
      <div className="flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Work Support"
              width={32}
              height={32}
              className="sm:w-8 sm:h-8 rounded-md shadow-md group-hover:shadow-lg transition-shadow"
            />
            <span className="font-bold text-xl bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Work Support
            </span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link
              to={ROUTES.login}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              ログイン
            </Link>
            <Link
              to={ROUTES.signup}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              新規登録
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link to={ROUTES.signup}>
            <Button
              size="sm"
              className="bg-linear-to-r from-primary to-primary/90 
                shadow-lg shadow-primary/20
                hover:shadow-xl hover:shadow-primary/30
                hover:scale-105 
                transition-all duration-300"
            >
              無料で始める
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-10 pt-8 border-t border-border/30 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Work Support. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
);
