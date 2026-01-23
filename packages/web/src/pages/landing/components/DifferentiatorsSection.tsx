import type { JSX } from "react";

import {
  differentiators,
  differentiatorsSectionTitle,
  type Differentiator,
} from "../landingContent";

export const DifferentiatorsSection = (): JSX.Element => (
  <section className="py-20 sm:py-28 px-4 relative overflow-hidden">
    {/* Background */}
    <div className="absolute inset-0 bg-linear-to-b from-background to-muted/30" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[150px]" />

    <div className="container mx-auto max-w-5xl relative z-10">
      <div className="text-center mb-16 sm:mb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
          <span className="text-xs font-medium text-primary">特徴</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
          <span className="bg-clip-text text-transparent bg-linear-to-r from-foreground to-foreground/70">
            {differentiatorsSectionTitle}
          </span>
        </h2>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        {differentiators.map((diff: Differentiator, index: number) => (
          <div
            key={diff.title}
            className="group relative"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Card glow effect */}
            <div className="absolute -inset-0.5 bg-linear-to-br from-primary/20 to-purple-500/20 rounded-2xl blur opacity-0 group-hover:opacity-50 transition-opacity duration-500" />

            <div
              className="relative h-full text-center p-6 sm:p-7 rounded-2xl 
              border border-border/50 
              bg-card/50
              backdrop-blur-xl
              hover:border-primary/20 
              hover:bg-linear-to-b hover:from-card/80 hover:to-primary/5
              hover:shadow-lg hover:shadow-primary/5
              transition-all duration-500 
              hover:-translate-y-1"
            >
              <div
                className="h-14 w-14 rounded-2xl 
                bg-linear-to-br from-primary/25 to-primary/10 
                flex items-center justify-center mx-auto mb-5 
                group-hover:scale-110 group-hover:rotate-6
                transition-transform duration-300 
                shadow-lg shadow-primary/10"
              >
                <diff.icon className="h-7 w-7 text-primary" />
              </div>

              <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">
                {diff.title}
              </h3>

              <p className="text-sm text-muted-foreground">
                {diff.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
