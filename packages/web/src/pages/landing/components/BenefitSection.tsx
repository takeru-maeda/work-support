import type { JSX } from "react";

import { benefitIcon as DefaultIcon } from "../landingContent";

interface BenefitSectionProps {
  benefits: string[];
}

export const BenefitSection = ({ benefits }: BenefitSectionProps): JSX.Element => {
  const Icon = DefaultIcon;

  return (
    <section className="py-16 sm:py-24 px-4 bg-linear-to-br from-muted/40 via-muted/30 to-muted/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-size-[32px_32px]" />
      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="grid md:grid-cols-2 gap-10 sm:gap-16 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              なぜWork Supportなのか
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground mb-6 sm:mb-8 leading-relaxed">
              複雑なツールは不要。必要な機能だけをシンプルに。
            </p>
            <ul className="space-y-3 sm:space-y-4">
              {benefits.map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-center gap-3 sm:gap-4 group"
                >
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-linear-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0 group-hover:from-primary/30 group-hover:to-primary/20 group-hover:scale-110 transition-all shadow-md">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <span className="text-base sm:text-lg group-hover:text-primary transition-colors">
                    {benefit}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative h-48 sm:h-64 md:h-96 rounded-3xl bg-linear-to-br from-primary/30 via-primary/20 to-primary/10 border-2 border-primary/20 flex items-center justify-center shadow-2xl overflow-hidden group hover:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.3)] transition-all">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.4),rgba(255,255,255,0))]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.1),transparent_50%)]" />
            <div className="absolute inset-0 backdrop-blur-3xl" />
            <div className="absolute top-10 right-10 w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full bg-primary/20 blur-2xl animate-pulse" />
            <div className="absolute bottom-10 left-10 w-12 h-12 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-primary/10 blur-xl animate-pulse delay-1000" />
            <div className="text-center relative z-10 px-4 py-4 sm:py-0">
              <div className="text-5xl sm:text-7xl md:text-8xl font-bold bg-linear-to-br from-primary via-primary to-primary/70 bg-clip-text text-transparent mb-1 sm:mb-2 md:mb-4 drop-shadow-2xl group-hover:scale-110 transition-transform">
                100%
              </div>
              <p className="text-base sm:text-lg text-muted-foreground">
                あなたの業務時間を見える化
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

