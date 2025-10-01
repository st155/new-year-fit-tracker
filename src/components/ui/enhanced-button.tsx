import * as React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EnhancedButtonProps extends ButtonProps {
  ripple?: boolean;
  glow?: boolean;
  haptic?: boolean;
}

export const EnhancedButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ children, className, ripple = true, glow = false, haptic = true, onClick, ...props }, ref) => {
    const [ripples, setRipples] = React.useState<Array<{ x: number; y: number; id: number }>>([]);
    const buttonRef = React.useRef<HTMLButtonElement>(null);

    const createRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!ripple) return;

      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const newRipple = { x, y, id: Date.now() };
      setRipples((prev) => [...prev, newRipple]);

      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 600);
    };

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      createRipple(event);

      // Haptic feedback (vibration) on mobile
      if (haptic && navigator.vibrate) {
        navigator.vibrate(10);
      }

      onClick?.(event);
    };

    return (
      <Button
        ref={(node) => {
          (buttonRef as any).current = node;
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        className={cn(
          "relative overflow-hidden transition-all duration-200",
          glow && "hover:shadow-glow",
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute rounded-full bg-white/30 pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: 0,
              height: 0,
              transform: "translate(-50%, -50%)",
              animation: "ripple 0.6s ease-out",
            }}
          />
        ))}
        {children}
      </Button>
    );
  }
);

EnhancedButton.displayName = "EnhancedButton";
