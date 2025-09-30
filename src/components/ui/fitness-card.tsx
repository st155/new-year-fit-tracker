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
        "transition-all duration-300 glass-card",
        {
          "border-border hover:shadow-glow hover:scale-[1.02]": variant === "default",
          "border-primary/50 shadow-glow glow-primary hover:scale-[1.02]": variant === "gradient",
          "border-success/50 shadow-glow-success glow-success hover:scale-[1.02]": variant === "success",
        },
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
}