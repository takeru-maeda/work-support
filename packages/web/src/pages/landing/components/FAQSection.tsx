"use client";

import type { JSX } from "react";
import { useState } from "react";

import {
  faqs,
  faqSectionTitle,
  faqIcon,
  type FAQItem,
} from "../landingContent";
import { cn } from "@/lib/utils";

const ChevronIcon = faqIcon;

export const FAQSection = (): JSX.Element => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number): void => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 sm:py-28 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-linear-to-b from-muted/30 to-background" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[120px]" />

      <div className="container mx-auto max-w-3xl relative z-10">
        <div className="text-center mb-14 sm:mb-18">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <span className="text-xs font-medium text-primary">サポート</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            <span className="bg-clip-text text-transparent bg-linear-to-r from-foreground to-foreground/70">
              {faqSectionTitle}
            </span>
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq: FAQItem, index: number) => (
            <div key={faq.question} className="group relative">
              {/* Card glow effect when open */}
              <div
                className={cn(
                  "absolute -inset-0.5 bg-linear-to-r from-primary/20 to-purple-500/20 rounded-2xl blur transition-opacity duration-300",
                  openIndex === index ? "opacity-50" : "opacity-0",
                )}
              />

              <div
                className={cn(
                  "relative rounded-2xl border backdrop-blur-xl transition-all duration-300",
                  openIndex === index
                    ? "border-primary/30 bg-linear-to-br from-card/95 to-card/90"
                    : "border-border/50 bg-card/80 hover:border-primary/20",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleFAQ(index)}
                  className="w-full flex items-center justify-between p-5 sm:p-6 text-left"
                >
                  <span className="font-semibold text-base sm:text-lg pr-4">
                    {faq.question}
                  </span>
                  <div
                    className={cn(
                      "shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300",
                      openIndex === index
                        ? "bg-primary/20 rotate-180"
                        : "bg-muted/50",
                    )}
                  >
                    <ChevronIcon
                      className={cn(
                        "h-4 w-4 transition-colors duration-300",
                        openIndex === index
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                    />
                  </div>
                </button>

                <div
                  className={cn(
                    "grid transition-all duration-300",
                    openIndex === index
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0 text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
