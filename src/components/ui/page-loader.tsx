import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageLoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  message?: string;
}

export function PageLoader({ 
  className, 
  size = "md",
  message 
}: PageLoaderProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-10 w-10",
    lg: "h-16 w-16",
  };

  return (
    <div className={cn(
      "flex flex-col items-center justify-center min-h-screen gap-4",
      className
    )}>
      <div className="relative">
        <Loader2 
          className={cn(
            "animate-spin text-primary",
            sizeClasses[size]
          )}
        />
        <div 
          className={cn(
            "absolute inset-0 animate-ping opacity-20",
            sizeClasses[size]
          )}
        >
          <Loader2 className="h-full w-full text-primary" />
        </div>
      </div>
      {message && (
        <p className="text-sm text-muted-foreground animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}

export function ComponentLoader({ 
  className,
  size = "sm" 
}: PageLoaderProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div className={cn(
      "flex items-center justify-center p-8",
      className
    )}>
      <Loader2 
        className={cn(
          "animate-spin text-primary",
          sizeClasses[size]
        )}
      />
    </div>
  );
}
