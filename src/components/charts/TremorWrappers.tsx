/**
 * Tremor Chart Wrappers
 * Reusable Tremor components with glassmorphism styling
 */

import { Card, Metric, Text, AreaChart, BarChart } from '@tremor/react';
import { ReactNode } from 'react';

interface TremorMetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  data?: any[];
  categories?: string[];
  color?: string;
  showChart?: boolean;
  icon?: ReactNode;
}

export function TremorMetricCard({
  title,
  value,
  unit,
  data,
  categories = ['value'],
  color = 'cyan',
  showChart = true,
  icon
}: TremorMetricCardProps) {
  return (
    <Card className="bg-card/50 border-white/20">
      <div className="flex items-center justify-between">
        <Text className="text-muted-foreground">{title}</Text>
        {icon}
      </div>
      <Metric className="mt-2">
        {value} {unit && <span className="text-lg ml-1">{unit}</span>}
      </Metric>
      {showChart && data && data.length > 0 && (
        <AreaChart
          data={data}
          index="date"
          categories={categories}
          colors={[color]}
          showLegend={false}
          showXAxis={false}
          showYAxis={false}
          showGridLines={false}
          className="h-16 mt-4"
          curveType="natural"
        />
      )}
    </Card>
  );
}

interface TremorAreaChartCardProps {
  title: string;
  description?: string;
  data: any[];
  categories: string[];
  colors: string[];
  valueFormatter?: (value: number) => string;
  className?: string;
  showGridLines?: boolean;
}

export function TremorAreaChartCard({
  title,
  description,
  data,
  categories,
  colors,
  valueFormatter,
  className = '',
  showGridLines = false,
}: TremorAreaChartCardProps) {
  return (
    <Card className={`bg-card/50 border-white/20 ${className}`}>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <Text className="mt-1 text-muted-foreground">{description}</Text>}
      <AreaChart
        className="h-72 mt-4"
        data={data}
        index="date"
        categories={categories}
        colors={colors}
        valueFormatter={valueFormatter}
        showLegend={true}
        showGridLines={showGridLines}
        curveType="natural"
      />
    </Card>
  );
}

interface TremorBarChartCardProps {
  title: string;
  description?: string;
  data: any[];
  categories: string[];
  colors: string[];
  valueFormatter?: (value: number) => string;
  stack?: boolean;
  className?: string;
  showGridLines?: boolean;
}

export function TremorBarChartCard({
  title,
  description,
  data,
  categories,
  colors,
  valueFormatter,
  stack = false,
  className = '',
  showGridLines = false,
}: TremorBarChartCardProps) {
  return (
    <Card className={`bg-card/50 border-white/20 ${className}`}>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <Text className="mt-1 text-muted-foreground">{description}</Text>}
      <BarChart
        className="h-72 mt-4"
        data={data}
        index="date"
        categories={categories}
        colors={colors}
        valueFormatter={valueFormatter}
        showLegend={categories.length > 1}
        showGridLines={showGridLines}
        stack={stack}
        showAnimation={true}
        animationDuration={300}
        yAxisWidth={48}
      />
    </Card>
  );
}
