import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ArrowRight, Calendar } from 'lucide-react';
import { BodyReport } from '@/hooks/composite/data/useMultiSourceBodyData';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface LatestBodyReportCardProps {
  report?: BodyReport;
  onViewReport?: (report: BodyReport) => void;
}

const REPORT_TYPE_LABELS = {
  inbody: 'InBody Scan',
  dexa: 'DEXA Scan',
  tanita: 'Tanita Analysis',
  manual: 'Manual Entry',
};

const REPORT_TYPE_COLORS = {
  inbody: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  dexa: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  tanita: 'bg-green-500/10 text-green-700 dark:text-green-400',
  manual: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
};

export function LatestBodyReportCard({ report, onViewReport }: LatestBodyReportCardProps) {
  if (!report) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Latest Body Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No body reports yet</p>
            <p className="text-xs mt-1">Upload an InBody scan to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const data = report.data;
  const isInBody = report.type === 'inbody';
  
  // Map InBody field names
  const bodyFatPercentage = isInBody ? data.percent_body_fat : data.body_fat_percentage;
  const visceralFatValue = isInBody ? data.visceral_fat_area : data.visceral_fat_level;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Latest Body Report
          </div>
          <Badge variant="outline" className={REPORT_TYPE_COLORS[report.type]}>
            {REPORT_TYPE_LABELS[report.type]}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {/* Date */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {format(new Date(report.date), 'MMMM dd, yyyy')}
        </div>

        {/* Key Findings */}
        <div>
          <h4 className="font-semibold mb-3">Key Findings:</h4>
          <div className="grid grid-cols-2 gap-3">
            {data.weight && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Weight</div>
                <div className="text-lg font-bold">{data.weight.toFixed(1)} kg</div>
              </div>
            )}
            {bodyFatPercentage && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Body Fat</div>
                <div className="text-lg font-bold">{bodyFatPercentage.toFixed(1)}%</div>
              </div>
            )}
            {data.skeletal_muscle_mass && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Skeletal Muscle</div>
                <div className="text-lg font-bold">{data.skeletal_muscle_mass.toFixed(1)} kg</div>
              </div>
            )}
            {isInBody && visceralFatValue && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Visceral Fat</div>
                <div className="text-lg font-bold">
                  {visceralFatValue.toFixed(1)}
                  <span className="text-xs ml-1 text-muted-foreground">
                    ({visceralFatValue < 10 ? 'Good' : 
                      visceralFatValue < 15 ? 'Normal' : 'High'})
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* InBody-specific metrics */}
        {isInBody && (data.bmr || data.total_body_water) && (
          <div className="pt-3 border-t border-border">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {data.bmr && (
                <div>
                  <span className="text-muted-foreground">BMR:</span>
                  <span className="ml-1 font-semibold">{Math.round(data.bmr)} kcal</span>
                </div>
              )}
              {data.total_body_water && (
                <div>
                  <span className="text-muted-foreground">Body Water:</span>
                  <span className="ml-1 font-semibold">{data.total_body_water.toFixed(1)} L</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => onViewReport?.(report)}
        >
          View Full Report
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
