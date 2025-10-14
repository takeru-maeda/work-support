import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

export function PageHeader({
  title,
  description,
  className,
  titleClassName,
  descriptionClassName,
}: Readonly<PageHeaderProps>) {
  return (
    <header className={cn("space-y-2", className)}>
      <h1
        className={cn(
          "text-3xl sm:text-4xl font-bold text-foreground text-balance",
          titleClassName,
        )}
      >
        {title}
      </h1>
      {description ? (
        <p
          className={cn(
            "text-muted-foreground text-base sm:text-lg",
            descriptionClassName,
          )}
        >
          {description}
        </p>
      ) : null}
    </header>
  );
}
