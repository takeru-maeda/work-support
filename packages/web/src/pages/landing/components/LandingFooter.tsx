import type { JSX } from "react";

import { Link } from "react-router-dom";

interface LandingFooterProps {
  loginHref: string;
  signupHref: string;
}

export const LandingFooter = ({ loginHref, signupHref }: LandingFooterProps): JSX.Element => (
  <footer className="py-10 sm:py-12 bg-background border-t">
    <div className="container mx-auto max-w-5xl px-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
      <div className="flex items-center gap-2 font-semibold text-foreground">
        <span>Work Support</span>
      </div>
      <div className="flex items-center gap-4">
        <Link to={loginHref} className="hover:text-primary">
          ログイン
        </Link>
        <Link to={signupHref} className="hover:text-primary">
          新規登録
        </Link>
      </div>
    </div>
  </footer>
);

