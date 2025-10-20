import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";

interface ClientProgressChartsProps {
  clientId: string;
  data?: any[];
}

type TimePeriod = "7" | "30" | "90" | "365" | "all";
type ChartType = "line" | "area" | "bar";

export const ClientProgressCharts = ({ clientId, data = [] }: ClientProgressChartsProps) => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("30");
  const [chartType, setChartType] = useState<ChartType>("line");

  // Filter data by time period
  const filterDataByPeriod = (data: any[], period: TimePeriod) => {
    if (period === "all") return data;
    
    const days = parseInt(period);
    const cutoffDate = subDays(new Date(), days);
    
    return data.filter(item => 
      new Date(item.date) >= cutoffDate
    );
  };

  const filteredData = filterDataByPeriod(data, timePeriod);

  const renderChart = () => {
    const chartProps = {
      data: filteredData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    const commonElements = (
      <>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="date" 
          tickFormatter={(value) => format(new Date(value), "MMM d")}
          className="text-xs"
        />
        <YAxis className="text-xs" />
        <Tooltip 
          labelFormatter={(value) => format(new Date(value), "MMM d, yyyy")}
          contentStyle={{ 
            backgroundColor: 'hsl(var(--background))', 
            border: '1px solid hsl(var(--border))' 
          }}
        />
        <Legend />
      </>
    );

    switch (chartType) {
      case "area":
        return (
          <AreaChart {...chartProps}>
            {commonElements}
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(var(--primary))" 
              fill="hsl(var(--primary))"
              fillOpacity={0.3}
            />
          </AreaChart>
        );
      case "bar":
        return (
          <BarChart {...chartProps}>
            {commonElements}
            <Bar dataKey="value" fill="hsl(var(--primary))" />
          </BarChart>
        );
      case "line":
      default:
        return (
          <LineChart {...chartProps}>
            {commonElements}
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))' }}
            />
          </LineChart>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Progress Over Time</CardTitle>
            <CardDescription>Track client metrics and improvements</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={chartType} onValueChange={(value) => setChartType(value as ChartType)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line</SelectItem>
                <SelectItem value="area">Area</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timePeriod} onValueChange={(value) => setTimePeriod(value as TimePeriod)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};