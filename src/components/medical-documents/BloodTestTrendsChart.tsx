import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBloodTestTrends } from "@/hooks/medical-documents/useBloodTestTrends";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea } from "recharts";
import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { healthApi } from '@/lib/api';

// Helper function to get standard unit for selected biomarkers
function getStandardUnit(selectedBiomarkers: string[], biomarkers?: any[]): string {
  if (!biomarkers || biomarkers.length === 0) return '';
  
  // Get the first biomarker's standard unit
  const firstBiomarker = biomarkers[0];
  if (firstBiomarker?.standard_unit) {
    return firstBiomarker.standard_unit;
  }
  
  return '';
}

// Map display names to canonical names for database queries
const BIOMARKER_MAP: Record<string, string> = {
  'Glucose': 'glucose',
  'Total Cholesterol': 'cholesterol_total',
  'HDL Cholesterol': 'cholesterol_hdl',
  'LDL Cholesterol': 'cholesterol_ldl',
  'Triglycerides': 'triglycerides',
  'ALT (SGPT)': 'alt',
  'AST (SGOT)': 'ast',
  'Creatinine': 'creatinine',
  'TSH': 'tsh',
  'Hemoglobin': 'hemoglobin',
  'Cortisol': 'cortisol',
  'Iron': 'iron',
  'HbA1c': 'hba1c',
  'Ferritin': 'ferritin',
  'Vitamin D': 'vitamin_d'
};

const COMMON_BIOMARKERS = Object.keys(BIOMARKER_MAP);

const CHART_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))'
];

export const BloodTestTrendsChart = () => {
  const { t } = useTranslation('medical');
  const [selectedBiomarkers, setSelectedBiomarkers] = useState<string[]>(['Glucose', 'Total Cholesterol']);
  const { toast } = useToast();
  // Convert display names to canonical names for the query
  const canonicalNames = selectedBiomarkers.map(name => BIOMARKER_MAP[name] || name);
  const { data, isLoading, refetch } = useBloodTestTrends(canonicalNames, selectedBiomarkers);

  const recalculateUnitsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await healthApi.fixUnitConversions();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast({
        title: `✅ ${t('bloodTests.recalculateComplete')}`,
        description: t('bloodTests.recalculateDesc', { updated: data.updated, skipped: data.skipped, total: data.total }),
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t('bloodTests.recalculateError'),
        description: error.message,
      });
    },
  });

  const fixDuplicatesMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await healthApi.fixDuplicateLabResults();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast({
        title: `✅ ${t('bloodTests.duplicatesCleared')}`,
        description: t('bloodTests.duplicatesDesc', { deleted: data.deleted }),
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t('bloodTests.duplicatesError'),
        description: error.message,
      });
    },
  });

  const stats = useMemo(() => {
    if (!data?.chartData || data.chartData.length < 2) return null;

    const results: any = {};
    selectedBiomarkers.forEach(biomarker => {
      const values = data.chartData
        .map(d => d[biomarker])
        .filter(v => typeof v === 'number') as number[];

      if (values.length >= 2) {
        const first = values[0];
        const last = values[values.length - 1];
        const change = last - first;
        const percent = (change / first) * 100;
        results[biomarker] = { change, percent };
      }
    });
    return results;
  }, [data, selectedBiomarkers]);

  const toggleBiomarker = (biomarker: string) => {
    setSelectedBiomarkers(prev =>
      prev.includes(biomarker)
        ? prev.filter(b => b !== biomarker)
        : [...prev, biomarker]
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recalculate Button */}
      <div className="flex justify-end gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => fixDuplicatesMutation.mutate()}
          disabled={fixDuplicatesMutation.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${fixDuplicatesMutation.isPending ? 'animate-spin' : ''}`} />
          {t('bloodTests.clearDuplicates')}
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => recalculateUnitsMutation.mutate()}
          disabled={recalculateUnitsMutation.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${recalculateUnitsMutation.isPending ? 'animate-spin' : ''}`} />
          {t('bloodTests.recalculateUnits')}
        </Button>
      </div>

      {/* Biomarker Selector */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">{t('bloodTests.selectBiomarkers')}</CardTitle>
          <CardDescription>{t('bloodTests.maxBiomarkers')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {COMMON_BIOMARKERS.map(biomarker => (
              <div key={biomarker} className="flex items-center space-x-2">
                <Checkbox
                  id={biomarker}
                  checked={selectedBiomarkers.includes(biomarker)}
                  onCheckedChange={() => toggleBiomarker(biomarker)}
                  disabled={selectedBiomarkers.length >= 5 && !selectedBiomarkers.includes(biomarker)}
                />
                <Label
                  htmlFor={biomarker}
                  className="text-sm cursor-pointer"
                >
                  {biomarker}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {stats && Object.keys(stats).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(stats).map(([biomarker, { change, percent }]: any) => (
            <Card key={biomarker} className="border-primary/10">
              <CardContent className="pt-4">
                <div className="text-xs text-muted-foreground mb-1 line-clamp-1">{biomarker}</div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-xl font-bold ${change > 0 ? 'text-orange-500' : change < 0 ? 'text-green-500' : ''}`}>
                    {change > 0 ? '+' : ''}{change.toFixed(1)}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {change > 0 ? <TrendingUp className="h-3 w-3" /> : change < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    {Math.abs(percent).toFixed(1)}%
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t('bloodTests.biomarkerDynamics')}
          </CardTitle>
          <CardDescription>
            {t('bloodTests.measurementsCount', { count: data?.chartData?.length || 0 })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.chartData && data.chartData.length >= 2 ? (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
          <YAxis
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            label={{ 
              value: getStandardUnit(selectedBiomarkers, data?.biomarkers), 
              angle: -90, 
              position: 'insideLeft',
              style: { fill: 'hsl(var(--muted-foreground))' }
            }}
          />
                  <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => {
                    const unit = getStandardUnit(selectedBiomarkers, data?.biomarkers);
                    return unit ? `${value} ${unit}` : value;
                  }}
                />
                  <Legend />
                  {selectedBiomarkers.map((biomarker, idx) => (
                    <Line
                      key={biomarker}
                      type="monotone"
                      dataKey={biomarker}
                      stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ fill: CHART_COLORS[idx % CHART_COLORS.length] }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>{t('bloodTests.insufficientData')}</p>
              <p className="text-sm">{t('bloodTests.uploadMinimum')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
