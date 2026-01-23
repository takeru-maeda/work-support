import type { JSX } from "react";

import { pains, painSectionTitle, type PainItem } from "../landingContent";

export const PainSection = (): JSX.Element => (
  <section className="py-20 sm:py-28 px-4 relative overflow-hidden">
    {/* Background */}
    <div className="absolute inset-0 bg-linear-to-b from-background via-destructive/2 to-background" />
    <div className="absolute top-1/2 left-0 w-[300px] h-[300px] rounded-full bg-destructive/5 blur-[100px] -translate-y-1/2" />

    <div className="container mx-auto max-w-4xl relative z-10">
      <div className="text-center mb-14 sm:mb-18">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20 mb-6">
          <span className="text-xs font-medium text-destructive/80">
            よくある課題
          </span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
          <span className="bg-clip-text text-transparent bg-linear-to-r from-foreground to-foreground/70">
            {painSectionTitle}
          </span>
        </h2>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
        {pains.map((pain: PainItem, index: number) => (
          <div
            key={pain.text}
            className="group relative"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Card glow effect */}
            <div className="absolute -inset-0.5 bg-linear-to-r from-destructive/20 to-destructive/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div
              className="relative flex items-center gap-4 p-5 sm:p-6 rounded-2xl 
              border border-destructive/10 
              bg-card/40
              backdrop-blur-sm
              hover:border-destructive/20 
              hover:bg-linear-to-br hover:from-card/60 hover:to-destructive/5
              transition-all duration-300
              hover:-translate-y-1"
            >
              <div
                className="shrink-0 h-12 w-12 rounded-xl 
                bg-linear-to-br from-destructive/20 to-destructive/10 
                flex items-center justify-center 
                group-hover:scale-110 group-hover:rotate-3
                transition-transform duration-300
                shadow-lg shadow-destructive/10"
              >
                <pain.icon className="h-5 w-5 text-destructive" />
              </div>
              <span className="text-base sm:text-lg font-medium text-foreground/90">
                {pain.text}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
