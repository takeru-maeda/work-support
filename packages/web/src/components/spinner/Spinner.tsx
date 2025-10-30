import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?:
    | "default"
    | "dots"
    | "pulse"
    | "ring"
    | "bars"
    | "orbit"
    | "grid"
    | "square"
    | "wave"
    | "spiral"
    | "box-3d"
    | "heart"
    | "diamond"
    | "breath"
    | "circle-fade";
  color?: "primary" | "secondary" | "accent" | "destructive" | "muted";
  className?: string;
}

export function Spinner({
  size = "md",
  variant = "default",
  color = "primary",
  className,
}: Readonly<SpinnerProps>) {
  const colorClasses = {
    primary:
      "text-primary [&>*]:bg-primary [&>*]:border-primary [&>*]:text-primary",
    secondary:
      "text-secondary [&>*]:bg-secondary [&>*]:border-secondary [&>*]:text-secondary",
    accent: "text-accent [&>*]:bg-accent [&>*]:border-accent [&>*]:text-accent",
    destructive:
      "text-destructive [&>*]:bg-destructive [&>*]:border-destructive [&>*]:text-destructive",
    muted:
      "text-muted-foreground [&>*]:bg-muted-foreground [&>*]:border-muted-foreground [&>*]:text-muted-foreground",
  };

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  if (variant === "dots") {
    const dotSizes = {
      sm: "w-1.5 h-1.5",
      md: "w-2.5 h-2.5",
      lg: "w-3.5 h-3.5",
      xl: "w-5 h-5",
    };
    return (
      <div className={cn("flex gap-1.5", colorClasses[color], className)}>
        <div
          className={cn(
            dotSizes[size],
            "rounded-full animate-bounce [animation-delay:-0.3s]",
          )}
        />
        <div
          className={cn(
            dotSizes[size],
            "rounded-full animate-bounce [animation-delay:-0.15s]",
          )}
        />
        <div className={cn(dotSizes[size], "rounded-full animate-bounce")} />
      </div>
    );
  }

  if (variant === "pulse") {
    return (
      <div
        className={cn(
          "relative",
          sizeClasses[size],
          colorClasses[color],
          className,
        )}
      >
        <div className="absolute inset-0 rounded-full animate-ping opacity-75" />
        <div className="relative rounded-full w-full h-full" />
      </div>
    );
  }

  if (variant === "ring") {
    return (
      <div
        className={cn(
          sizeClasses[size],
          "border-4 border-muted rounded-full animate-spin",
          color === "primary" && "border-t-primary",
          color === "secondary" && "border-t-secondary",
          color === "accent" && "border-t-accent",
          color === "destructive" && "border-t-destructive",
          color === "muted" && "border-t-muted-foreground",
          className,
        )}
      />
    );
  }

  if (variant === "bars") {
    const barHeights = {
      sm: "h-3",
      md: "h-6",
      lg: "h-9",
      xl: "h-12",
    };
    const barWidths = {
      sm: "w-0.5",
      md: "w-1",
      lg: "w-1.5",
      xl: "w-2",
    };
    return (
      <div
        className={cn(
          "flex items-center gap-1",
          colorClasses[color],
          className,
        )}
      >
        <div
          className={cn(
            barWidths[size],
            barHeights[size],
            "animate-pulse [animation-delay:-0.4s] [animation-duration:1s]",
          )}
        />
        <div
          className={cn(
            barWidths[size],
            barHeights[size],
            "animate-pulse [animation-delay:-0.2s] [animation-duration:1s]",
          )}
        />
        <div
          className={cn(
            barWidths[size],
            barHeights[size],
            "animate-pulse [animation-duration:1s]",
          )}
        />
        <div
          className={cn(
            barWidths[size],
            barHeights[size],
            "animate-pulse [animation-delay:-0.2s] [animation-duration:1s]",
          )}
        />
        <div
          className={cn(
            barWidths[size],
            barHeights[size],
            "animate-pulse [animation-delay:-0.4s] [animation-duration:1s]",
          )}
        />
      </div>
    );
  }

  if (variant === "orbit") {
    const orbitSizes = {
      sm: { container: "w-4 h-4", dot: "w-1 h-1" },
      md: { container: "w-8 h-8", dot: "w-2 h-2" },
      lg: { container: "w-12 h-12", dot: "w-3 h-3" },
      xl: { container: "w-16 h-16", dot: "w-4 h-4" },
    };
    return (
      <div
        className={cn(
          "relative",
          orbitSizes[size].container,
          colorClasses[color],
          className,
        )}
      >
        <div className="absolute inset-0 animate-spin [animation-duration:1.5s]">
          <div
            className={cn(
              orbitSizes[size].dot,
              "absolute top-0 left-1/2 -translate-x-1/2 rounded-full",
            )}
          />
        </div>
        <div className="absolute inset-0 animate-spin [animation-duration:1.5s] [animation-delay:-0.5s]">
          <div
            className={cn(
              orbitSizes[size].dot,
              "absolute top-0 left-1/2 -translate-x-1/2 rounded-full opacity-60",
            )}
          />
        </div>
        <div className="absolute inset-0 animate-spin [animation-duration:1.5s] [animation-delay:-1s]">
          <div
            className={cn(
              orbitSizes[size].dot,
              "absolute top-0 left-1/2 -translate-x-1/2 rounded-full opacity-30",
            )}
          />
        </div>
      </div>
    );
  }

  if (variant === "grid") {
    const gridDotSizes = {
      sm: "w-1 h-1",
      md: "w-1.5 h-1.5",
      lg: "w-2 h-2",
      xl: "w-3 h-3",
    };
    const gridGaps = {
      sm: "gap-0.5",
      md: "gap-1",
      lg: "gap-1.5",
      xl: "gap-2",
    };
    return (
      <div
        className={cn(
          "grid grid-cols-3",
          gridGaps[size],
          colorClasses[color],
          className,
        )}
      >
        {[...Array(9)].map((_, i) => (
          <div
            key={i}
            className={cn(
              gridDotSizes[size],
              "rounded-sm animate-pulse",
              `[animation-delay:-${(i * 0.1).toFixed(1)}s]`,
              "[animation-duration:0.9s]",
            )}
          />
        ))}
      </div>
    );
  }

  if (variant === "square") {
    const squareSizes = {
      sm: "w-3 h-3",
      md: "w-6 h-6",
      lg: "w-9 h-9",
      xl: "w-12 h-12",
    };
    return (
      <div
        className={cn(
          "relative",
          sizeClasses[size],
          colorClasses[color],
          className,
        )}
      >
        <div
          className={cn(
            squareSizes[size],
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin [animation-duration:1.2s]",
            "[animation-timing-function:cubic-bezier(0.68,-0.55,0.265,1.55)]",
          )}
          style={{
            clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
          }}
        />
      </div>
    );
  }

  if (variant === "wave") {
    const waveHeights = {
      sm: "h-3",
      md: "h-6",
      lg: "h-9",
      xl: "h-12",
    };
    const waveWidths = {
      sm: "w-0.5",
      md: "w-1",
      lg: "w-1.5",
      xl: "w-2",
    };
    return (
      <div
        className={cn("flex items-end gap-0.5", colorClasses[color], className)}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              waveWidths[size],
              waveHeights[size],
              "origin-bottom",
              "animate-[wave_1s_ease-in-out_infinite]",
            )}
            style={{
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === "spiral") {
    return (
      <div className={cn("relative", sizeClasses[size], className)}>
        <div
          className={cn(
            "absolute inset-0 border-4 border-transparent rounded-full animate-spin [animation-duration:1s]",
            color === "primary" && "border-t-primary",
            color === "secondary" && "border-t-secondary",
            color === "accent" && "border-t-accent",
            color === "destructive" && "border-t-destructive",
            color === "muted" && "border-t-muted-foreground",
          )}
        />
        <div
          className={cn(
            "absolute inset-[15%] border-4 border-transparent rounded-full animate-spin [animation-duration:1.2s] [animation-direction:reverse]",
            color === "primary" && "border-r-primary",
            color === "secondary" && "border-r-secondary",
            color === "accent" && "border-r-accent",
            color === "destructive" && "border-r-destructive",
            color === "muted" && "border-r-muted-foreground",
          )}
        />
        <div
          className={cn(
            "absolute inset-[30%] border-4 border-transparent rounded-full animate-spin [animation-duration:1.4s]",
            color === "primary" && "border-b-primary",
            color === "secondary" && "border-b-secondary",
            color === "accent" && "border-b-accent",
            color === "destructive" && "border-b-destructive",
            color === "muted" && "border-b-muted-foreground",
          )}
        />
      </div>
    );
  }

  if (variant === "box-3d") {
    const boxSizes = {
      sm: "w-3 h-3",
      md: "w-6 h-6",
      lg: "w-9 h-9",
      xl: "w-12 h-12",
    };
    return (
      <div
        className={cn(
          "relative",
          sizeClasses[size],
          colorClasses[color],
          className,
        )}
        style={{ perspective: "100px" }}
      >
        <div
          className={cn(
            boxSizes[size],
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            "animate-[box3d_2s_ease-in-out_infinite]",
          )}
          style={{
            transformStyle: "preserve-3d",
          }}
        />
      </div>
    );
  }

  if (variant === "heart") {
    return (
      <div
        className={cn(
          "relative",
          sizeClasses[size],
          colorClasses[color],
          className,
        )}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full animate-[heartbeat_1.5s_ease-in-out_infinite]"
        >
          <path
            d="M50,85 C50,85 15,60 15,40 C15,25 25,15 35,15 C42,15 47,20 50,25 C53,20 58,15 65,15 C75,15 85,25 85,40 C85,60 50,85 50,85 Z"
            fill="currentColor"
          />
        </svg>
      </div>
    );
  }

  if (variant === "diamond") {
    const diamondSizes = {
      sm: "w-3 h-3",
      md: "w-6 h-6",
      lg: "w-9 h-9",
      xl: "w-12 h-12",
    };
    return (
      <div
        className={cn(
          "relative",
          sizeClasses[size],
          colorClasses[color],
          className,
        )}
      >
        <div
          className={cn(
            diamondSizes[size],
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            "animate-[diamond_2s_ease-in-out_infinite]",
          )}
        >
          <div className="absolute inset-0 rotate-45" />
          <div className="absolute inset-0 opacity-50 rotate-45 scale-75" />
        </div>
      </div>
    );
  }

  if (variant === "breath") {
    return (
      <div
        className={cn(
          "relative",
          sizeClasses[size],
          colorClasses[color],
          className,
        )}
      >
        <div className="absolute inset-0 rounded-full animate-[breath_3s_ease-in-out_infinite]" />
        <div className="absolute inset-[10%] opacity-70 rounded-full animate-[breath_3s_ease-in-out_infinite] [animation-delay:0.3s]" />
        <div className="absolute inset-[20%] opacity-40 rounded-full animate-[breath_3s_ease-in-out_infinite] [animation-delay:0.6s]" />
      </div>
    );
  }

  if (variant === "circle-fade") {
    const dotCount = 12;
    const dotSizes = {
      sm: "w-1 h-1",
      md: "w-1.5 h-1.5",
      lg: "w-2 h-2",
      xl: "w-3 h-3",
    };
    const containerSizes = {
      sm: "w-6 h-6",
      md: "w-10 h-10",
      lg: "w-14 h-14",
      xl: "w-20 h-20",
    };

    return (
      <div
        className={cn(
          "relative",
          containerSizes[size],
          colorClasses[color],
          className,
        )}
      >
        {[...Array(dotCount)].map((_, i) => {
          const angle = (i * 360) / dotCount;
          const delay = (i * 1000) / dotCount;
          return (
            <div
              key={i}
              className={cn(
                dotSizes[size],
                "absolute top-1/2 left-1/2 rounded-full",
                "animate-[circle-fade_1.2s_ease-in-out_infinite]",
              )}
              style={{
                transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${size === "sm" ? "10" : size === "md" ? "16" : size === "lg" ? "22" : "32"}px)`,
                animationDelay: `${delay}ms`,
              }}
            />
          );
        })}
      </div>
    );
  }

  // Default spinner
  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      <div className="absolute inset-0 border-4 border-muted rounded-full" />
      <div
        className={cn(
          "absolute inset-0 border-4 border-transparent rounded-full animate-spin",
          color === "primary" && "border-t-primary border-r-primary",
          color === "secondary" && "border-t-secondary border-r-secondary",
          color === "accent" && "border-t-accent border-r-accent",
          color === "destructive" &&
            "border-t-destructive border-r-destructive",
          color === "muted" &&
            "border-t-muted-foreground border-r-muted-foreground",
        )}
      />
    </div>
  );
}
