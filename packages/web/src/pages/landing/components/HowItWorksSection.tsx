import type { JSX } from "react";

import { steps, howItWorksSectionTitle, type Step } from "../landingContent";

export const HowItWorksSection = (): JSX.Element => (
  <section className="py-20 sm:py-28 px-4 relative overflow-hidden">
    {/* Background */}
    <div className="absolute inset-0 bg-linear-to-b from-background to-muted/20" />
    <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-purple-500/5 blur-[120px]" />
    <div className="absolute top-0 right-1/4 w-[300px] h-[300px] rounded-full bg-primary/5 blur-[100px]" />

    <div className="container mx-auto max-w-5xl relative z-10">
      <div className="text-center mb-16 sm:mb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
          <span className="text-xs font-medium text-primary">はじめ方</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
          <span className="bg-clip-text text-transparent bg-linear-to-r from-foreground to-foreground/70">
            {howItWorksSectionTitle}
          </span>
        </h2>
      </div>

      {/* Desktop timeline */}
      <div className="hidden md:block relative mb-8">
        <div className="absolute top-10 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-primary/30 to-transparent" />
        <div className="absolute top-10 left-0 right-0 h-0.5 bg-linear-to-r from-primary/50 via-primary to-primary/50 scale-x-0 animate-[scale-x_2s_ease-out_forwards] origin-left" />
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
        {steps.map((step: Step, index: number) => (
          <div
            key={step.number}
            className="group relative"
            style={{ animationDelay: `${index * 150}ms` }}
          >
            {/* Connector line for mobile */}
            {index < steps.length - 1 && (
              <div className="md:hidden absolute left-1/2 top-full h-6 w-0.5 bg-linear-to-b from-primary/30 to-transparent" />
            )}

            <div
              className="relative flex flex-col items-center text-center p-6 sm:p-8 rounded-3xl 
              border border-border/50 
              bg-card/50
              backdrop-blur-xl
              hover:border-primary/20 
              hover:bg-linear-to-b hover:from-card/80 hover:to-primary/5
              hover:shadow-xl hover:shadow-primary/5
              transition-all duration-500 
              hover:-translate-y-2
              h-full justify-between"
            >
              <div className="flex flex-col items-center w-full">
                {/* Step number badge */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                  <div
                    className="h-8 w-8 rounded-full bg-linear-to-br from-primary to-primary/80 
                    flex items-center justify-center 
                    text-sm font-bold text-primary-foreground
                    shadow-lg shadow-primary/30
                    ring-4 ring-background"
                  >
                    {step.number}
                  </div>
                </div>

                {/* Icon */}
                <div
                  className="mt-4 mb-5 h-16 w-16 rounded-2xl 
                  bg-linear-to-br from-primary/20 to-primary/5 
                  flex items-center justify-center 
                  group-hover:scale-110 group-hover:rotate-6
                  transition-transform duration-300
                  shadow-xl shadow-primary/10"
                >
                  <step.icon className="h-8 w-8 text-primary" />
                </div>

                <h3 className="font-bold text-lg sm:text-xl mb-3 group-hover:text-primary transition-colors min-h-14 flex items-center justify-center">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
