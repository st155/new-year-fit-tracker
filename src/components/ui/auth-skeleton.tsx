import { Skeleton } from "@/components/ui/skeleton";

export function AuthLoadingSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-6 space-y-6 animate-fade-in">
        {/* Logo/Brand Skeleton */}
        <div className="flex flex-col items-center space-y-3">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>

        {/* Card Skeleton */}
        <div className="glass-card p-8 space-y-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>

        {/* Footer Skeleton */}
        <div className="flex justify-center">
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
    </div>
  );
}
