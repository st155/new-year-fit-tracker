import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface ClientDetailSkeletonProps {
  onBack?: () => void;
}

export function ClientDetailSkeleton({ onBack }: ClientDetailSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} disabled={!onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>
        </div>
        
        {/* Actions Bar Skeleton */}
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Client Header Card Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            {/* Avatar Skeleton */}
            <Skeleton className="h-16 w-16 rounded-full" />
            
            <div className="flex-1 space-y-2">
              {/* Name and username */}
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-32" />
              
              {/* Badges */}
              <div className="flex gap-2 mt-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-32" />
              </div>
            </div>
            
            {/* Health Score Skeleton */}
            <div className="hidden lg:block">
              <Skeleton className="h-48 w-64 rounded-lg" />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters Skeleton */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-28" />
          </div>
        </CardContent>
      </Card>

      {/* Tabs Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        
        {/* Goals Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>
                <div className="flex justify-between text-sm">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
