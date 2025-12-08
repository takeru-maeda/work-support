import type { JSX } from "react";

import { LandingHeader } from "./components/LandingHeader";
import { HeroSection } from "./components/HeroSection";
import { FeaturesSection } from "./components/FeaturesSection";
import { BenefitSection } from "./components/BenefitSection";
import { LandingFooter } from "./components/LandingFooter";
import { useScrollToFeatures } from "./hooks/useScrollToFeatures";
import { benefits, features, hero } from "./landingContent";

import { ROUTES } from "@/config/routes";

export default function LandingPage(): JSX.Element {
  const scrollToFeatures = useScrollToFeatures();

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-background to-muted/30">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full bg-primary/3 blur-3xl" />
      </div>

      <LandingHeader
        logoHref={ROUTES.landing}
        loginHref={ROUTES.login}
        signupHref={ROUTES.signup}
      />

      <HeroSection
        titleLines={hero.titleLines}
        leadLines={hero.leadLines}
        signupHref={ROUTES.signup}
        onScrollToFeatures={scrollToFeatures}
        CtaIcon={hero.primaryCtaIcon}
      />

      <FeaturesSection features={features} />

      <BenefitSection benefits={benefits} />

      <LandingFooter loginHref={ROUTES.login} signupHref={ROUTES.signup} />
    </div>
  );
}
