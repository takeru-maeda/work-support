import type { JSX } from "react";

import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { hero } from "../landingContent";
import { ROUTES } from "@/config/routes";

interface HeroSectionProps {
  onScrollToFeatures: () => void;
}

const CtaIcon = hero.primaryCtaIcon;

export const HeroSection = ({
  onScrollToFeatures,
}: HeroSectionProps): JSX.Element => (
  <section className="pt-28 sm:pt-36 pb-20 sm:pb-32 px-4 relative overflow-hidden">
    {/* Animated background gradients */}
    <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-purple-500/5" />
    <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
    <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-purple-500/10 blur-[100px] animate-pulse delay-1000" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-linear-to-r from-primary/5 to-purple-500/5 blur-[150px]" />

    {/* Grid pattern overlay */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-size-[32px_32px]" />

    <div className="container mx-auto max-w-5xl text-center relative z-10">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
        <span className="text-sm font-medium text-primary">
          業務効率化ツール
        </span>
      </div>

      <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 sm:mb-8 tracking-tight leading-tight animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">
        <span className="bg-clip-text text-transparent bg-linear-to-r from-foreground via-foreground to-foreground/70">
          {hero.catchphrase}
        </span>
      </h1>

      <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-10 sm:mb-12 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
        {hero.subcopy}
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-10 duration-700 delay-500">
        <Link to={ROUTES.signup} className="w-full sm:w-auto">
          <Button
            size="lg"
            className="w-full sm:w-auto text-base sm:text-lg px-10 sm:px-12 py-5 sm:py-6 h-auto font-semibold
              bg-linear-to-r from-primary via-primary to-primary/90 
              shadow-[0_10px_40px_-10px_rgba(var(--primary),0.5)]
              hover:shadow-[0_20px_60px_-15px_rgba(var(--primary),0.6)]
              hover:scale-[1.02] active:scale-[0.98]
              transition-all duration-300 
              relative group overflow-hidden"
          >
            <div className="absolute inset-0 bg-linear-to-r from-white/0 via-white/25 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="relative">{hero.primaryCta}</span>
            <CtaIcon className="ml-2 h-5 w-5 relative group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
        <Button
          size="lg"
          variant="outline"
          onClick={onScrollToFeatures}
          className="w-full sm:w-auto text-base sm:text-lg px-10 sm:px-12 py-5 sm:py-6 h-auto font-medium
            border-2 border-border/50 
            bg-background/50 backdrop-blur-md
            hover:bg-muted/80 hover:border-primary/30
            shadow-lg hover:shadow-xl 
            hover:scale-[1.02] active:scale-[0.98]
            transition-all duration-300"
        >
          {hero.secondaryCta}
        </Button>
      </div>
    </div>
  </section>
);
