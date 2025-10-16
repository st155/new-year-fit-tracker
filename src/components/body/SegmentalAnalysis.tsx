import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AggregatedBodyMetrics } from "@/hooks/useAggregatedBodyMetrics";

interface SegmentalAnalysisProps {
  segmental?: AggregatedBodyMetrics['segmental'];
}

export function SegmentalAnalysis({ segmental }: SegmentalAnalysisProps) {
  if (!segmental) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Segmental Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            InBody data required for segmental analysis
          </p>
        </CardContent>
      </Card>
    );
  }

  const segments = [
    { name: 'Right Arm', data: segmental.rightArm },
    { name: 'Left Arm', data: segmental.leftArm },
    { name: 'Trunk', data: segmental.trunk },
    { name: 'Right Leg', data: segmental.rightLeg },
    { name: 'Left Leg', data: segmental.leftLeg },
  ].filter(s => s.data);

  const getZoneColor = (zone: string) => {
    switch (zone) {
      case 'low':
        return 'text-orange-400';
      case 'normal':
        return 'text-green-400';
      case 'high':
        return 'text-purple-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const getZoneLabel = (zone: string) => {
    switch (zone) {
      case 'low':
        return 'Below Normal';
      case 'normal':
        return 'Normal';
      case 'high':
        return 'Above Normal';
      default:
        return 'N/A';
    }
  };

  const getProgressVariant = (zone: string) => {
    switch (zone) {
      case 'low':
        return 'warning' as const;
      case 'normal':
        return 'success' as const;
      case 'high':
        return 'default' as const;
      default:
        return 'default' as const;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Segmental Analysis
          <Badge variant="outline" className="bg-primary/20 text-primary">InBody</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Simple body diagram */}
        <div className="flex justify-center mb-8">
          <svg width="200" height="300" viewBox="0 0 200 300" className="text-foreground">
            {/* Head */}
            <circle cx="100" cy="30" r="20" fill="currentColor" opacity="0.2" />
            
            {/* Trunk */}
            <rect x="70" y="55" width="60" height="100" rx="10" fill="currentColor" opacity="0.2" />
            
            {/* Arms */}
            <rect x="25" y="60" width="40" height="80" rx="8" fill="currentColor" opacity="0.2" />
            <rect x="135" y="60" width="40" height="80" rx="8" fill="currentColor" opacity="0.2" />
            
            {/* Legs */}
            <rect x="75" y="160" width="20" height="120" rx="8" fill="currentColor" opacity="0.2" />
            <rect x="105" y="160" width="20" height="120" rx="8" fill="currentColor" opacity="0.2" />

            {/* Labels */}
            <text x="100" y="105" textAnchor="middle" fontSize="10" fill="currentColor">Trunk</text>
            <text x="45" y="105" textAnchor="middle" fontSize="10" fill="currentColor">L</text>
            <text x="155" y="105" textAnchor="middle" fontSize="10" fill="currentColor">R</text>
            <text x="85" y="225" textAnchor="middle" fontSize="10" fill="currentColor">L</text>
            <text x="115" y="225" textAnchor="middle" fontSize="10" fill="currentColor">R</text>
          </svg>
        </div>

        {/* Segment details */}
        <div className="space-y-4">
          {segments.map(({ name, data }) => (
            <div key={name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{name}</span>
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs", getZoneColor(data!.zone))}
                  >
                    {getZoneLabel(data!.zone)}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold">{data!.percent.toFixed(1)}%</span>
                  <span className="text-xs text-muted-foreground">{data!.mass.toFixed(2)} kg</span>
                </div>
              </div>
              <Progress 
                value={Math.min(data!.percent, 120)} 
                variant={getProgressVariant(data!.zone)}
                className="h-2"
              />
            </div>
          ))}
        </div>

        <div className="pt-4 border-t space-y-2">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold">Normal range:</span> 90-110% of standard
          </p>
          <p className="text-xs text-muted-foreground">
            Values indicate muscle development relative to your body composition
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
