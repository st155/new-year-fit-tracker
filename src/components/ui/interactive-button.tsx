import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const interactiveButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 hover:shadow-lg transition-all duration-200",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-95 hover:shadow-lg transition-all duration-200",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground active:scale-95 transition-all duration-200",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95 hover:shadow-md transition-all duration-200",
        ghost: "hover:bg-accent hover:text-accent-foreground active:scale-95 transition-all duration-150",
        link: "text-primary underline-offset-4 hover:underline",
        premium:
          "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 active:scale-95 hover:shadow-xl hover:shadow-purple-500/50 transition-all duration-200",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
      animation: {
        none: "",
        pulse: "animate-pulse",
        bounce: "hover:animate-bounce",
        wiggle: "hover:animate-wiggle",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      animation: "none",
    },
  }
);

export interface InteractiveButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof interactiveButtonVariants> {
  asChild?: boolean;
  loading?: boolean;
  success?: boolean;
}

const InteractiveButton = React.forwardRef<HTMLButtonElement, InteractiveButtonProps>(
  ({ className, variant, size, animation, asChild = false, loading, success, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const [isPressed, setIsPressed] = React.useState(false);

    return (
      <Comp
        className={cn(
          interactiveButtonVariants({ variant, size, animation, className }),
          loading && "cursor-wait opacity-70",
          success && "bg-green-600 hover:bg-green-700",
          isPressed && "scale-95"
        )}
        ref={ref}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading && (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {success && (
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
        {children}
      </Comp>
    );
  }
);
InteractiveButton.displayName = "InteractiveButton";

export { InteractiveButton, interactiveButtonVariants };
