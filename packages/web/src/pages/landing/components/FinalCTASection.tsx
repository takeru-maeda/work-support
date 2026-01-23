import type { JSX } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { finalCTA } from "../landingContent";
import { ROUTES } from "@/config/routes";

const CtaIcon = finalCTA.primaryCtaIcon;

export const FinalCTASection = (): JSX.Element => (
  <section className="py-24 sm:py-36 px-4 relative overflow-hidden">
    {/* Background gradients */}
    <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-purple-500/5 to-background" />
    <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[150px]" />
    <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-purple-500/10 blur-[120px]" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-r from-primary/5 to-purple-500/5 blur-[200px]" />

    {/* Grid pattern */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary),0.03)_1px,transparent_1px)] bg-size-[40px_40px]" />

    <div className="container mx-auto max-w-3xl text-center relative z-10">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-8">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
        <span className="text-sm font-medium text-primary">無料で使えます</span>
      </div>

      <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 tracking-tight">
        <span className="bg-clip-text text-transparent bg-linear-to-r from-foreground via-foreground to-foreground/70">
          {finalCTA.title}
        </span>
      </h2>

      <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-10 sm:mb-12 leading-relaxed max-w-2xl mx-auto">
        {finalCTA.subtitle}
      </p>

      <Link to={ROUTES.signup}>
        <Button
          size="lg"
          className="text-base sm:text-lg px-12 sm:px-16 py-6 sm:py-7 h-auto font-semibold
            bg-linear-to-r from-primary via-primary to-primary/90 
            shadow-[0_15px_50px_-10px_rgba(var(--primary),0.5)]
            hover:shadow-[0_25px_70px_-15px_rgba(var(--primary),0.6)]
            hover:scale-[1.02] active:scale-[0.98]
            transition-all duration-300 
            relative group overflow-hidden"
        >
          <div className="absolute inset-0 bg-linear-to-r from-white/0 via-white/25 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <span className="relative">{finalCTA.primaryCta}</span>
          <CtaIcon className="ml-3 h-5 w-5 sm:h-6 sm:w-6 relative group-hover:translate-x-1 transition-transform" />
        </Button>
      </Link>

      <p className="mt-8 text-sm text-muted-foreground flex items-center justify-center gap-2">
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-green-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        </span>
        クレジットカード不要・すぐに使い始められます
      </p>
    </div>
  </section>
);
