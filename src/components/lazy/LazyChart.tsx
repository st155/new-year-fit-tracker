import { lazy, Suspense } from "react";
import { ComponentLoader } from "@/components/ui/page-loader";
import { cn } from "@/lib/utils";

// Lazy load recharts components
const RechartsChart = lazy(() => import("recharts").then(module => ({
  default: module.ResponsiveContainer
})));

interface LazyChartProps {
  children: React.ReactNode;
  className?: string;
  height?: number | string;
}

/**
 * LazyChart - обертка для ленивой загрузки графиков
 * Используйте для тяжелых графиков, которые не нужны сразу
 */
export function LazyChart({ children, className, height = 300 }: LazyChartProps) {
  return (
    <Suspense fallback={
      <div 
        className={cn("flex items-center justify-center bg-muted/20 rounded-lg", className)}
        style={{ height }}
      >
        <ComponentLoader />
      </div>
    }>
      {children}
    </Suspense>
  );
}
