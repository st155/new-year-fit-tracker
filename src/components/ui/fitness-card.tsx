import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface FitnessCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "gradient" | "success";
  children: React.ReactNode;
}

export function FitnessCard({ className, variant = "default", children, ...props }: FitnessCardProps) {
  return (
    <Card
      className={cn(
        "transition-all duration-300",
        {
          "bg-gradient-card border-border/50 shadow-card hover:shadow-glow": variant === "default",
          "bg-gradient-primary border-primary/30 shadow-glow text-primary-foreground": variant === "gradient",
          "bg-gradient-success border-success/30 shadow-success text-success-foreground": variant === "success",
        },
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
}