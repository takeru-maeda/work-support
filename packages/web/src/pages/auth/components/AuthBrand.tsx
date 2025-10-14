import { cn } from "@/lib/utils";

interface AuthBrandProps {
  title: string;
  subtitle: string;
  className?: string;
}

export function AuthBrand({ title, subtitle, className }: Readonly<AuthBrandProps>) {
  return (
    <div className={cn("flex flex-col items-center space-y-4", className)}>
      <img
        src="/logo.png"
        alt="Work Support"
        className="h-20 w-20 rounded-md object-contain"
      />
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="text-muted-foreground">{subtitle}</p>
    </div>
  );
}
