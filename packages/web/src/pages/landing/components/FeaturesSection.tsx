import type { JSX } from "react";

import type { Feature } from "../landingContent";

interface FeaturesSectionProps {
  features: Feature[];
}

export const FeaturesSection = ({ features }: FeaturesSectionProps): JSX.Element => (
  <section id="features" className="py-16 sm:py-24 px-4 relative">
    <div className="container mx-auto max-w-7xl">
      <div className="text-center mb-12 sm:mb-20">
        <div className="inline-block mb-4">
          <div className="h-1 w-16 sm:w-20 bg-linear-to-r from-transparent via-primary to-transparent rounded-full mx-auto mb-4 sm:mb-6" />
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            主な機能
          </h2>
        </div>
        <p className="text-lg sm:text-xl text-muted-foreground">シンプルで強力なツールセット</p>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="group p-6 sm:p-8 rounded-2xl border-2 bg-card/80 backdrop-blur-sm hover:border-primary/30 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] transition-all duration-500 hover:-translate-y-3 relative overflow-hidden"
          >
            <div
              className={`absolute inset-0 bg-linear-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
            />
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-primary/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <div
                className={`h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-linear-to-br ${feature.iconBg} flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}
              >
                <feature.icon className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              </div>
              <h3 className="font-bold text-xl sm:text-2xl mb-2 sm:mb-3 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-transparent via-primary/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
          </div>
        ))}
      </div>
    </div>
  </section>
);
