import type { ComponentType, JSX } from "react";

import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  titleLines: string[];
  leadLines: string[];
  signupHref: string;
  onScrollToFeatures: () => void;
  CtaIcon: ComponentType<{ className?: string }>;
}

export const HeroSection = ({
  titleLines,
  leadLines,
  signupHref,
  onScrollToFeatures,
  CtaIcon,
}: HeroSectionProps): JSX.Element => (
  <section className="pt-24 sm:pt-32 pb-16 sm:pb-24 px-4 relative bg-linear-to-br from-muted/20 via-background to-muted/30">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-size-[24px_24px] opacity-40" />
    <div className="container mx-auto max-w-5xl text-center relative z-10">
      <h1 className="text-5xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 tracking-tight bg-clip-text text-transparent bg-linear-to-r from-foreground via-foreground to-foreground/60 drop-shadow-sm leading-tight">
        {titleLines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </h1>

      <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground mb-8 sm:mb-10 max-w-3xl mx-auto leading-relaxed drop-shadow-sm">
        {leadLines.map((line, index) => (
          <span
            key={line}
            className={index === 0 ? "block" : "block hidden md:block"}
          >
            {line}
          </span>
        ))}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
        <Link to={signupHref} className="w-full sm:w-auto">
          <Button
            size="lg"
            className="shadow-2xl hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] transition-all duration-300 w-full sm:w-auto text-sm sm:text-base px-8 sm:px-10 py-3 sm:py-5 h-auto bg-linear-to-r from-primary via-primary to-primary/90 hover:scale-105 relative group overflow-hidden"
          >
            <div className="absolute inset-0 bg-linear-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <span className="relative">無料で始める</span>
            <CtaIcon className="ml-2 h-4 w-4 sm:h-5 sm:w-5 relative group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
        <Button
          size="lg"
          variant="outline"
          onClick={onScrollToFeatures}
          className="w-full sm:w-auto text-sm sm:text-base px-8 sm:px-10 py-3 sm:py-5 h-auto border-2 hover:bg-muted/80 bg-background/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
          機能を見る
        </Button>
      </div>
    </div>
  </section>
);
