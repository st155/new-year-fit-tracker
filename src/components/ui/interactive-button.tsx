import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InteractiveButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "ripple" | "bounce" | "shine" | "press" | "glow";
  children: ReactNode;
}

export function InteractiveButton({ 
  variant = "ripple", 
  children, 
  className,
  ...props 
}: InteractiveButtonProps) {
  const variantClasses = {
    ripple: "ripple",
    bounce: "hover-bounce",
    shine: "shine",
    press: "press-effect",
    glow: "hover-glow"
  };

  return (
    <button
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// Специализированные кнопки с микроинтеракциями
export function FloatingActionButton({ 
  children, 
  className,
  ...props 
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "fixed bottom-6 right-6 h-14 w-14 rounded-full",
        "bg-gradient-primary text-white shadow-lg",
        "hover-bounce hover:shadow-2xl",
        "transition-all duration-300",
        "z-50 flex items-center justify-center",
        "animate-bounce-in",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconButton({ 
  children, 
  className,
  ...props 
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "p-2 rounded-lg transition-all duration-300",
        "hover:bg-muted hover:scale-110",
        "active:scale-95",
        "icon-spin-hover",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function PulseButton({ 
  children, 
  className,
  ...props 
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "relative px-6 py-3 rounded-xl",
        "bg-gradient-primary text-white font-semibold",
        "animate-glow-pulse",
        "hover:scale-105 active:scale-95",
        "transition-all duration-300",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SwingButton({ 
  children, 
  className,
  ...props 
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "px-4 py-2 rounded-lg",
        "hover:animate-swing",
        "transition-all duration-300",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
