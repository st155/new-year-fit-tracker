import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, Target, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const mockData = [
  { date: "Jan", weight: 75, bodyFat: 20, vo2max: 45 },
  { date: "Feb", weight: 74, bodyFat: 19.5, vo2max: 46 },
  { date: "Mar", weight: 73, bodyFat: 19, vo2max: 47 },
  { date: "Apr", weight: 72.5, bodyFat: 18.8, vo2max: 48 },
  { date: "May", weight: 72, bodyFat: 18.5, vo2max: 50 },
  { date: "Jun", weight: 71.5, bodyFat: 18.2, vo2max: 52 },
];

function ProgressCard({ 
  title, 
  current, 
  target, 
  unit, 
  trend, 
  color = "primary" 
}: {
  title: string;
  current: number;
  target: number;
  unit: string;
  trend: number;
  color?: string;
}) {
  const progress = (current / target) * 100;
  const isPositive = trend > 0;

  return (
    <Card className="bg-gradient-card border-border/50 hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <Badge 
            variant={isPositive ? "default" : "destructive"} 
            className="text-xs"
          >
            {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {Math.abs(trend)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-foreground">{current}</span>
            <span className="text-lg text-muted-foreground mb-1">{unit}</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress to goal</span>
              <span className="font-medium">{progress.toFixed(0)}%</span>
            </div>
            <Progress 
              value={progress} 
              className="h-2"
            />
            <div className="text-sm text-muted-foreground">
              Target: {target} {unit}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ModernProgress() {
  const [timeRange, setTimeRange] = useState<"1M" | "3M" | "6M" | "1Y">("3M");
  const [activeTab, setActiveTab] = useState<"body" | "performance" | "health">("body");

  const progressData = [
    {
      title: "Weight Loss",
      current: 72,
      target: 70,
      unit: "kg",
      trend: -4.2,
      color: "weight"
    },
    {
      title: "Body Fat",
      current: 18.5,
      target: 15,
      unit: "%",
      trend: -8.1,
      color: "body-fat"
    },
    {
      title: "VO₂ Max",
      current: 52,
      target: 55,
      unit: "ml/kg/min",
      trend: 12.5,
      color: "vo2max"
    },
    {
      title: "2KM Row",
      current: 445,
      target: 420,
      unit: "sec",
      trend: -3.8,
      color: "row"
    }
  ];

  const tabsConfig = {
    body: { 
      title: "Body Composition", 
      icon: Activity,
      metrics: ["Weight", "Body Fat %", "Muscle Mass"]
    },
    performance: { 
      title: "Performance", 
      icon: Target,
      metrics: ["VO₂ Max", "2KM Row", "Pull-ups"]
    },
    health: { 
      title: "Health", 
      icon: Calendar,
      metrics: ["Recovery", "Sleep", "Steps"]
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Progress Tracking
          </h1>
          <p className="text-lg text-muted-foreground">
            Monitor your fitness journey and celebrate your achievements
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Period:</span>
          {(["1M", "3M", "6M", "1Y"] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range)}
              className="h-8"
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {progressData.map((item, index) => (
          <ProgressCard key={index} {...item} />
        ))}
      </div>

      {/* Charts Section */}
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-card/30 p-1 rounded-lg border border-border/50">
          {(Object.keys(tabsConfig) as Array<keyof typeof tabsConfig>).map((tab) => {
            const config = tabsConfig[tab];
            const Icon = config.icon;
            
            return (
              <Button
                key={tab}
                variant={activeTab === tab ? "default" : "ghost"}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 flex items-center gap-2 justify-center",
                  activeTab === tab && "bg-primary/10 text-primary shadow-sm"
                )}
              >
                <Icon className="h-4 w-4" />
                {config.title}
              </Button>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trend Chart */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Progress Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="hsl(var(--metric-weight))" 
                    strokeWidth={2}
                    name="Weight (kg)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="bodyFat" 
                    stroke="hsl(var(--metric-body-fat))" 
                    strokeWidth={2}
                    name="Body Fat (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Area Chart */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-accent" />
                Performance Evolution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={mockData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="vo2max"
                    stroke="hsl(var(--metric-vo2max))"
                    fill="hsl(var(--metric-vo2max) / 0.2)"
                    strokeWidth={2}
                    name="VO₂ Max"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Stats */}
      <Card className="bg-gradient-primary border-primary/30 text-primary-foreground">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            This Month's Highlights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="space-y-2">
              <div className="text-2xl font-bold">5.2kg</div>
              <div className="text-sm opacity-90">Weight Lost</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold">2.1%</div>
              <div className="text-sm opacity-90">Body Fat Reduced</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold">7</div>
              <div className="text-sm opacity-90">PRs Hit</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold">24</div>
              <div className="text-sm opacity-90">Workouts Completed</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}