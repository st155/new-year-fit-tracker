import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TrainerBadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  withGlow?: boolean;
  className?: string;
}

const variantClasses = {
  default: {
    base: "bg-trainer-orange/10 text-trainer-orange border-trainer-orange/30",
    glow: "shadow-[0_0_10px_rgba(255,107,53,0.3)]"
  },
  success: {
    base: "bg-trainer-green/10 text-trainer-green border-trainer-green/30",
    glow: "shadow-[0_0_10px_rgba(78,205,196,0.3)]"
  },
  warning: {
    base: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
    glow: "shadow-[0_0_10px_rgba(234,179,8,0.3)]"
  },
  danger: {
    base: "bg-red-500/10 text-red-600 border-red-500/30",
    glow: "shadow-[0_0_10px_rgba(239,68,68,0.3)]"
  },
  info: {
    base: "bg-trainer-blue/10 text-trainer-blue border-trainer-blue/30",
    glow: "shadow-[0_0_10px_rgba(69,183,209,0.3)]"
  }
};

export function TrainerBadge({
  children,
  variant = "default",
  withGlow = false,
  className
}: TrainerBadgeProps) {
  const styles = variantClasses[variant];

  return (
    <Badge 
      className={cn(
        styles.base,
        "transition-all duration-300",
        withGlow && styles.glow,
        className
      )}
    >
      {children}
    </Badge>
  );
}
