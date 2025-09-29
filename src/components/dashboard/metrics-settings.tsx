import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Save, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface MetricConfig {
  key: string;
  title: string;
  unit?: string;
  color: "body-fat" | "weight" | "vo2max" | "row" | "recovery" | "steps";
  description: string;
  category: "body" | "performance" | "health";
}

const availableMetrics: MetricConfig[] = [
  {
    key: "body_fat",
    title: "BODY FAT ЖИРА",
    unit: "%",
    color: "body-fat",
    description: "Body fat percentage tracking",
    category: "body"
  },
  {
    key: "weight",
    title: "WEIGHT",
    unit: "кг",
    color: "weight", 
    description: "Weight measurements",
    category: "body"
  },
  {
    key: "vo2max",
    title: "VO₂MAX",
    unit: "ML/KG/MIN",
    color: "vo2max",
    description: "Cardiovascular fitness indicator",
    category: "performance"
  },
  {
    key: "row_2km",
    title: "2KM ROW",
    unit: "MIN",
    color: "row",
    description: "2km rowing time performance",
    category: "performance"
  },
  {
    key: "recovery",
    title: "RECOVERY SCORE",
    unit: "%",
    color: "recovery",
    description: "Daily recovery and readiness",
    category: "health"
  },
  {
    key: "steps", 
    title: "DAILY STEPS",
    unit: "steps",
    color: "steps",
    description: "Daily step count tracking",
    category: "health"
  }
];

const defaultMetrics = ["body_fat", "weight", "vo2max", "row_2km"];

interface MetricsSettingsProps {
  onMetricsChange: (metrics: string[]) => void;
  selectedMetrics: string[];
}

export function MetricsSettings({ onMetricsChange, selectedMetrics }: MetricsSettingsProps) {
  const { user } = useAuth();
  const [tempSelected, setTempSelected] = useState<string[]>(selectedMetrics);
  const [isOpen, setIsOpen] = useState(false);

  const colorClasses = {
    "body-fat": "border-metric-body-fat bg-metric-body-fat/5 text-metric-body-fat",
    "weight": "border-metric-weight bg-metric-weight/5 text-metric-weight", 
    "vo2max": "border-metric-vo2max bg-metric-vo2max/5 text-metric-vo2max",
    "row": "border-metric-row bg-metric-row/5 text-metric-row",
    "recovery": "border-success bg-success/5 text-success",
    "steps": "border-accent bg-accent/5 text-accent"
  };

  const handleToggleMetric = (metricKey: string) => {
    if (tempSelected.includes(metricKey)) {
      if (tempSelected.length > 1) {
        setTempSelected(tempSelected.filter(k => k !== metricKey));
      } else {
        toast.error("At least one metric must be selected");
      }
    } else {
      if (tempSelected.length < 4) {
        setTempSelected([...tempSelected, metricKey]);
      } else {
        toast.error("Maximum 4 metrics can be selected");
      }
    }
  };

  const handleSave = async () => {
    try {
      if (user) {
        // Save to user preferences or localStorage
        localStorage.setItem(`user_metrics_${user.id}`, JSON.stringify(tempSelected));
        onMetricsChange(tempSelected);
        toast.success("Metrics configuration saved!");
        setIsOpen(false);
      }
    } catch (error) {
      toast.error("Failed to save metrics configuration");
    }
  };

  const handleReset = () => {
    setTempSelected(defaultMetrics);
    toast.info("Reset to default metrics");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="absolute top-4 right-4 z-20 bg-card/80 backdrop-blur-sm hover:bg-card"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configure Dashboard Metrics
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Select up to 4 metrics to display on your dashboard
            </p>
            <Badge variant="secondary">
              {tempSelected.length}/4 selected
            </Badge>
          </div>

          {["body", "performance", "health"].map(category => (
            <div key={category} className="space-y-3">
              <h3 className="font-medium text-foreground capitalize">
                {category} Metrics
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableMetrics
                  .filter(metric => metric.category === category)
                  .map(metric => {
                    const isSelected = tempSelected.includes(metric.key);
                    
                    return (
                      <Card
                        key={metric.key}
                        className={cn(
                          "cursor-pointer transition-all duration-200 border-2",
                          isSelected 
                            ? colorClasses[metric.color]
                            : "border-border/50 bg-card hover:bg-card/80"
                        )}
                        onClick={() => handleToggleMetric(metric.key)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm">
                                  {metric.title}
                                </h4>
                                {metric.unit && (
                                  <span className="text-xs text-muted-foreground">
                                    {metric.unit}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {metric.description}
                              </p>
                            </div>
                            
                            {isSelected && (
                              <Badge 
                                variant="secondary" 
                                className="text-xs bg-primary/10 text-primary"
                              >
                                #{tempSelected.indexOf(metric.key) + 1}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          ))}

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Default
            </Button>
            
            <Button 
              onClick={handleSave}
              disabled={tempSelected.length === 0}
              className="bg-primary hover:bg-primary/90"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}