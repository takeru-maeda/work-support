import type { JSX } from "react";

import { LandingHeader } from "./components/LandingHeader";
import { HeroSection } from "./components/HeroSection";
import { PainSection } from "./components/PainSection";
import { SolutionSection } from "./components/SolutionSection";
import { FeaturesSection } from "./components/FeaturesSection";
import { HowItWorksSection } from "./components/HowItWorksSection";
import { UseCaseSection } from "./components/UseCaseSection";
import { DifferentiatorsSection } from "./components/DifferentiatorsSection";
import { FAQSection } from "./components/FAQSection";
import { FinalCTASection } from "./components/FinalCTASection";
import { LandingFooter } from "./components/LandingFooter";
import { useScrollToFeatures } from "./hooks/useScrollToFeatures";

import { ROUTES } from "@/config/routes";

export default function LandingPage(): JSX.Element {
  const scrollToFeatures = useScrollToFeatures();

  return (
    <div className="min-h-screen bg-background relative">
      {/* Global background decorations */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[1000px] h-[1000px] rounded-full bg-primary/3 blur-[200px]" />
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] rounded-full bg-purple-500/2 blur-[200px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] rounded-full bg-linear-to-r from-primary/2 to-purple-500/2 blur-[250px]" />
      </div>

      {/* 1. Header */}
      <LandingHeader
        logoHref={ROUTES.landing}
        loginHref={ROUTES.login}
        signupHref={ROUTES.signup}
      />

      {/* 2. Hero Section */}
      <HeroSection onScrollToFeatures={scrollToFeatures} />

      {/* 3. Pain Section (課題提起) */}
      <PainSection />

      {/* 4. Solution Section (解決策) */}
      <SolutionSection />

      {/* 5. Features Section (機能紹介) */}
      <FeaturesSection />

      {/* 6. How It Works Section (使い方ステップ) */}
      <HowItWorksSection />

      {/* 7. Use Case Section (ユースケース) */}
      <UseCaseSection />

      {/* 8. Differentiators Section (特徴/差別化) */}
      <DifferentiatorsSection />

      {/* 9. FAQ Section */}
      <FAQSection />

      {/* 10. Final CTA Section */}
      <FinalCTASection />

      {/* 11. Footer */}
      <LandingFooter />
    </div>
  );
}
