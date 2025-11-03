import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const progressVariants = cva(
  "h-full w-full flex-1 transition-all",
  {
    variants: {
      variant: {
        default: "bg-primary",
        success: "bg-green-500 dark:bg-green-400",
        warning: "bg-yellow-500 dark:bg-yellow-400", 
        danger: "bg-red-500 dark:bg-red-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

// Function to determine color based on value
const getProgressVariant = (value: number | null | undefined): "success" | "warning" | "danger" => {
  if (!value) return "danger";
  if (value > 100) return "success"; // Overachievement = green
  if (value >= 65) return "success";
  if (value >= 35) return "warning";
  return "danger";
};

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {
  autoColor?: boolean;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, variant, autoColor = false, ...props }, ref) => {
  const finalVariant = autoColor ? getProgressVariant(value) : variant;
  
  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary/50", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(progressVariants({ variant: finalVariant }))}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress, progressVariants };
