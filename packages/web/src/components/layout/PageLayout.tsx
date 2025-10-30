import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "../shared/PageHeader";
import { Button } from "../ui/button";
import { ArrowLeft } from "lucide-react";
import LoadingSpinner from "../spinner/LoadingSpinner";

interface PageLayoutProps {
  children: ReactNode;
  pageTitle: string;
  pageDescription: string;
  loading?: boolean;
  onBack?: () => void;
  className?: string;
  containerClassName?: string;
}

export function PageLayout({
  children,
  pageTitle,
  pageDescription,
  loading = false,
  onBack,
  className,
  containerClassName,
}: Readonly<PageLayoutProps>) {
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      <PageContainer className={containerClassName}>
        <div className="mb-6 sm:mb-8">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="mb-3 gap-2 -mt-2"
            >
              <ArrowLeft className="h-4 w-4" />
              戻る
            </Button>
          )}
          <div className="flex justify-between items-start">
            <PageHeader title={pageTitle} description={pageDescription} />
            <LoadingSpinner loading={loading} />
          </div>
        </div>

        {children}
      </PageContainer>
    </div>
  );
}
