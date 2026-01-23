import type { JSX } from "react";

import { useCases, useCaseSectionTitle, type UseCase } from "../landingContent";

export const UseCaseSection = (): JSX.Element => (
  <section className="py-20 sm:py-28 px-4 relative overflow-hidden">
    {/* Background */}
    <div className="absolute inset-0 bg-linear-to-br from-muted/40 via-muted/20 to-background" />
    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(var(--primary),0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(var(--primary),0.02)_1px,transparent_1px)] bg-size-[48px_48px]" />
    <div className="absolute top-1/2 left-0 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[120px] -translate-y-1/2" />
    <div className="absolute top-1/2 right-0 w-[300px] h-[300px] rounded-full bg-purple-500/5 blur-[100px] -translate-y-1/2" />

    <div className="container mx-auto max-w-5xl relative z-10">
      <div className="text-center mb-16 sm:mb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
          <span className="text-xs font-medium text-primary">活用シーン</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
          <span className="bg-clip-text text-transparent bg-linear-to-r from-foreground to-foreground/70">
            {useCaseSectionTitle}
          </span>
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
        {useCases.map((useCase: UseCase, index: number) => (
          <div
            key={useCase.title}
            className="group relative"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Card glow effect */}
            <div className="absolute -inset-0.5 bg-linear-to-br from-primary/20 via-purple-500/20 to-primary/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-60 transition-opacity duration-500" />

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
              <div
                className="h-16 w-16 rounded-2xl 
                bg-linear-to-br from-primary/25 to-primary/10 
                flex items-center justify-center mb-6 
                group-hover:scale-110 group-hover:rotate-6
                transition-transform duration-300 
                shadow-xl shadow-primary/10"
              >
                <useCase.icon className="h-8 w-8 text-primary" />
              </div>

              <h3 className="font-bold text-xl sm:text-2xl mb-3 group-hover:text-primary transition-colors">
                {useCase.title}
              </h3>

              <p className="text-muted-foreground leading-relaxed">
                {useCase.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
