import type { JSX } from "react";

import {
  features,
  featuresSectionTitle,
  featuresSectionSubtitle,
  type Feature,
} from "../landingContent";

export const FeaturesSection = (): JSX.Element => (
  <section
    id="features"
    className="py-20 sm:py-28 px-4 relative overflow-hidden"
  >
    {/* Background */}
    <div className="absolute inset-0 bg-linear-to-b from-background via-muted/30 to-background" />
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[150px]" />

    <div className="container mx-auto max-w-6xl relative z-10">
      <div className="text-center mb-16 sm:mb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
          <span className="text-xs font-medium text-primary">機能紹介</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
          <span className="bg-clip-text text-transparent bg-linear-to-r from-foreground to-foreground/70">
            {featuresSectionTitle}
          </span>
        </h2>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
          {featuresSectionSubtitle}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {features.map((feature: Feature, index: number) => (
          <div
            key={feature.title}
            className="group relative"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Card glow effect */}
            <div
              className={`absolute -inset-0.5 bg-linear-to-br ${feature.iconBg} rounded-3xl blur-lg opacity-0 group-hover:opacity-60 transition-opacity duration-500`}
            />

            <div
              className="relative h-full p-7 sm:p-8 rounded-3xl 
              border border-border/50
              bg-card/50
              backdrop-blur-xl
              hover:border-primary/20 
              hover:bg-linear-to-br hover:from-card/80 hover:via-card/60 hover:to-primary/5
              hover:shadow-xl hover:shadow-primary/5
              transition-all duration-500 
              hover:-translate-y-2"
            >
              {/* Decorative gradient */}
              <div
                className={`absolute inset-0 bg-linear-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl`}
              />

              {/* Decorative blur */}
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative">
                <div
                  className={`h-16 w-16 rounded-2xl bg-linear-to-br ${feature.iconBg} 
                  flex items-center justify-center mb-6 
                  group-hover:scale-110 group-hover:rotate-3 
                  transition-all duration-300 
                  shadow-xl`}
                >
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>

                <h3 className="font-bold text-xl sm:text-2xl mb-3 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>

                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>

              {/* Bottom accent line */}
              <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-linear-to-r from-transparent via-primary/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
