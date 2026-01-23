import type { JSX } from "react";

import {
  solutions,
  solutionSectionTitle,
  type SolutionItem,
} from "../landingContent";

export const SolutionSection = (): JSX.Element => (
  <section className="py-20 sm:py-28 px-4 relative overflow-hidden">
    {/* Background */}
    <div className="absolute inset-0 bg-linear-to-b from-background via-primary/2 to-background" />
    <div className="absolute top-1/2 right-0 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[120px] -translate-y-1/2" />

    <div className="container mx-auto max-w-4xl relative z-10">
      <div className="text-center mb-14 sm:mb-18">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
          <span className="text-xs font-medium text-primary">解決策</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
          <span className="bg-clip-text text-transparent bg-linear-to-r from-primary via-primary to-primary/70">
            {solutionSectionTitle}
          </span>
        </h2>
      </div>

      <div className="space-y-4 sm:space-y-5">
        {solutions.map((solution: SolutionItem, index: number) => (
          <div
            key={solution.before}
            className="group relative"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Card glow effect */}
            <div className="absolute -inset-0.5 bg-linear-to-r from-primary/30 via-primary/20 to-purple-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div
              className="relative flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-6 sm:p-8 rounded-2xl 
              border border-primary/10 
              bg-card/50
              backdrop-blur-sm
              hover:border-primary/20 
              hover:bg-linear-to-br hover:from-card/80 hover:via-card/60 hover:to-primary/5
              transition-all duration-300
              hover:-translate-y-1
              hover:shadow-xl hover:shadow-primary/5"
            >
              <div
                className="shrink-0 h-14 w-14 rounded-2xl 
                bg-linear-to-br from-primary/30 to-primary/10 
                flex items-center justify-center 
                group-hover:scale-110 group-hover:rotate-6
                transition-transform duration-300
                shadow-xl shadow-primary/20"
              >
                <solution.icon className="h-7 w-7 text-primary" />
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-5 text-center sm:text-left flex-1">
                <span className="text-lg sm:text-xl font-semibold text-foreground">
                  {solution.before}
                </span>
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0 rotate-90 sm:rotate-0 transition-transform">
                  <span className="text-xl text-primary font-bold">→</span>
                </div>
                <span className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-primary to-purple-500">
                  {solution.after}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
