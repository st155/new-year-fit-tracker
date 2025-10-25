import { lazy, Suspense, memo, useMemo, ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Dynamic imports для каждого типа чарта
const LineChartComponent = lazy(() => 
  import('./recharts-wrappers/LineChartWrapper')
);
const BarChartComponent = lazy(() =>
  import('./recharts-wrappers/BarChartWrapper')
);
const AreaChartComponent = lazy(() =>
  import('./recharts-wrappers/AreaChartWrapper')
);

export interface ChartConfig {
  xKey: string;
  yKey: string;
  color: string;
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  label?: string;
}

interface ChartProps {
  type: 'line' | 'bar' | 'area';
  data: any[];
  config: ChartConfig;
  height?: number;
}

function transformDataForChart(data: any[], config: ChartConfig) {
  return data.map(point => ({
    [config.xKey]: point[config.xKey],
    [config.yKey]: point[config.yKey],
    ...point,
  }));
}

export const OptimizedChart = memo(function OptimizedChart({
  type, 
  data, 
  config, 
  height = 300
}: ChartProps) {
  // Мемоизация данных
  const chartData = useMemo(() => 
    transformDataForChart(data, config),
    [data, config]
  );

  const ChartComponent = useMemo(() => {
    return {
      line: LineChartComponent,
      bar: BarChartComponent,
      area: AreaChartComponent,
    }[type];
  }, [type]);

  return (
    <Suspense 
      fallback={
        <Skeleton className="w-full rounded-lg" style={{ height }} />
      }
    >
      <ChartComponent data={chartData} config={config} height={height} />
    </Suspense>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.type === nextProps.type &&
    prevProps.data.length === nextProps.data.length &&
    prevProps.config.xKey === nextProps.config.xKey &&
    prevProps.config.yKey === nextProps.config.yKey &&
    prevProps.height === nextProps.height
  );
});
