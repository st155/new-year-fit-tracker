import { Card, BarChart } from "@tremor/react";

interface MicroTrackerCardProps {
  title: string;
  data: Array<{ date: string; value: number }>;
  color: "purple" | "violet" | "indigo";
  valueFormatter?: (value: number) => string;
}

export function MicroTrackerCard({ 
  title, 
  data, 
  color,
  valueFormatter = (value) => `${value}`
}: MicroTrackerCardProps) {
  return (
    <Card className="bg-neutral-900 border-2 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      
      <BarChart
        className="h-56"
        data={data}
        index="date"
        categories={["value"]}
        colors={[color]}
        valueFormatter={valueFormatter}
        showLegend={false}
        showGridLines={false}
      />
    </Card>
  );
}
