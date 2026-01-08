import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, Minus, Info, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBiomarkerTrends, useBiomarkerHistory } from '@/hooks/useBiomarkers';
import { BiomarkerTrendChart } from '@/components/biomarkers/BiomarkerTrendChart';
import QualitativeTrendChart from '@/components/biomarkers/QualitativeTrendChart';
import { BiomarkerSettingsModal } from '@/components/biomarkers/BiomarkerSettingsModal';
import { RecommendedSupplementsCard } from '@/components/biomarkers/RecommendedSupplementsCard';
import { useAddSupplementToStack } from '@/hooks/biostack/useAddSupplementToStack';
import { BeforeAfterCard } from '@/components/biostack/BeforeAfterCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';

export default function BiomarkerDetail() {
  const { t } = useTranslation('biomarkerDetail');
  const { biomarkerId } = useParams<{ biomarkerId: string }>();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const { addToStack, isAdding } = useAddSupplementToStack();
  
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP
  const { analysis, isLoading: analysisLoading } = useBiomarkerTrends(biomarkerId || '');
  const { history, isLoading: historyLoading } = useBiomarkerHistory(biomarkerId || '');
  
  // Fetch stack items linked to this biomarker
  const { data: linkedStackItems } = useQuery({
    queryKey: ['linked-stack-items', biomarkerId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('user_stack')
        .select('id, stack_name, start_date')
        .eq('user_id', user.id)
        .contains('linked_biomarker_ids', [biomarkerId!])
        .not('start_date', 'is', null)
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!biomarkerId,
  });

  // Calculate time in optimal zone - MUST be called before any conditional returns
  const timeInOptimalZone = useMemo(() => {
    const analysisData = analysis as any;
    if (!analysisData?.success) return null;
    const bm = analysisData?.biomarker;
    const refs = analysisData?.reference_ranges;
    const historyData = analysisData?.history;
    const isQual = bm?.data_type === 'qualitative';
    if (isQual || !historyData || !refs?.optimal_min || !refs?.optimal_max) {
      return null;
    }
    
    const inOptimal = historyData.filter(
      (h: any) => h.value >= refs.optimal_min! && h.value <= refs.optimal_max!
    ).length;
    
    return Math.round((inOptimal / historyData.length) * 100);
  }, [analysis]);

  // NOW we can have conditional returns - after all hooks
  if (!biomarkerId) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <p className="text-muted-foreground">{t('invalidId')}</p>
          <Button onClick={() => navigate('/medical-documents')} variant="outline" className="mt-4">
            {t('backToDocs')}
          </Button>
        </div>
      </div>
    );
  }

  if (analysisLoading || historyLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  // Show basic history if analysis failed but we have data
  const analysisAny = analysis as any;
  if ((!analysisAny || !analysisAny.success) && history && history.length > 0) {
    const latestResult = history[0];
    const biomarkerName = latestResult.biomarker_master?.display_name || t('defaultName');
    
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/medical-documents')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{biomarkerName}</h1>
            <p className="text-muted-foreground">{t('measurementHistory')}</p>
          </div>
        </div>
        
        <Card className="mb-4 border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="pt-4">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              ⚠️ {t('aiUnavailable')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('lastValue')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">{latestResult.normalized_value}</span>
              <span className="text-lg text-muted-foreground">{latestResult.normalized_unit}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {format(new Date(latestResult.test_date), 'dd MMMM yyyy', { locale: ru })}
            </p>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t('measurementHistory')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.slice(0, 10).map((result) => (
                <div key={result.id} className="flex justify-between items-center p-3 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(result.test_date), 'dd MMM yyyy', { locale: ru })}
                  </span>
                  <span className="font-medium">
                    {result.normalized_value} {result.normalized_unit}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
          🔄 {t('tryRefresh')}
        </Button>
      </div>
    );
  }

  if (!analysisAny || !analysisAny.success) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <p className="text-muted-foreground">{t('noDataForAnalysis')}</p>
          <Button onClick={() => navigate('/medical-documents')} variant="outline" className="mt-4">
            {t('backToDocs')}
          </Button>
        </div>
      </div>
    );
  }

  const { biomarker, statistics, zones, reference_ranges, insights } = analysisAny;

  // Check if biomarker is qualitative (text-based data)
  const isQualitative = biomarker.data_type === 'qualitative';

  const statusColor =
    statistics.latest < reference_ranges.min ? 'yellow' :
    statistics.latest > reference_ranges.max ? 'red' :
    statistics.latest >= reference_ranges.optimal_min && statistics.latest <= reference_ranges.optimal_max ? 'blue' :
    'green';

  const statusText = 
    statistics.latest < reference_ranges.min ? t('status.belowNormal') :
    statistics.latest > reference_ranges.max ? t('status.aboveNormal') :
    statistics.latest >= reference_ranges.optimal_min && statistics.latest <= reference_ranges.optimal_max ? t('status.optimal') :
    t('status.normal');

  const TrendIcon = statistics.trend === 'increasing' ? TrendingUp : statistics.trend === 'decreasing' ? TrendingDown : Minus;

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/medical-documents')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{biomarker.name}</h1>
          <p className="text-muted-foreground capitalize">{biomarker.category}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSettings(true)}
          className="border-purple-500/50 hover:bg-purple-500/10 hover:shadow-[0_0_10px_rgba(168,85,247,0.2)]"
        >
          <Settings className="h-4 w-4 mr-2" />
          {t('customizeOptimalRange')}
        </Button>
      </div>

      {/* Latest Value Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('lastValue')}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{statistics.latest}</span>
                <span className="text-lg text-muted-foreground">{biomarker.unit}</span>
                <TrendIcon
                  className={cn(
                    'w-5 h-5 ml-2',
                    statistics.trend === 'increasing' && 'text-green-600',
                    statistics.trend === 'decreasing' && 'text-red-600',
                    statistics.trend === 'stable' && 'text-gray-400'
                  )}
                />
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'text-lg px-4 py-2',
                statusColor === 'blue' && 'text-blue-600 bg-blue-50 border-blue-200',
                statusColor === 'green' && 'text-green-600 bg-green-50 border-green-200',
                statusColor === 'yellow' && 'text-yellow-600 bg-yellow-50 border-yellow-200',
                statusColor === 'red' && 'text-red-600 bg-red-50 border-red-200'
              )}
            >
              {statusText}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="trend" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trend">{t('tabs.trend')}</TabsTrigger>
          <TabsTrigger value="statistics">{t('tabs.statistics')}</TabsTrigger>
          <TabsTrigger value="history">{t('tabs.history')}</TabsTrigger>
          <TabsTrigger value="about">{t('tabs.about')}</TabsTrigger>
        </TabsList>

        <TabsContent value="trend" className="space-y-6">
          {isQualitative ? (
            <Card>
              <CardHeader>
                <CardTitle>{t('chartTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <QualitativeTrendChart history={analysisAny.history} />
              </CardContent>
            </Card>
          ) : (
            <BiomarkerTrendChart
              data={analysisAny.history}
              unit={biomarker.unit}
              referenceRanges={reference_ranges}
            />
          )}

          {/* Before/After Cards for linked supplements */}
          {linkedStackItems && linkedStackItems.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('supplementsImpact')}</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {linkedStackItems.map((item) => (
                  <BeforeAfterCard
                    key={item.id}
                    stackItemId={item.id}
                    biomarkerId={biomarkerId}
                  />
                ))}
              </div>
            </div>
          )}

          {/* AI Insights */}
          {insights && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  {t('aiAnalysis')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                  {insights}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="statistics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('zones.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">{t('zones.belowNormal')}</span>
                  <span className="text-sm font-semibold">{zones.below_normal}%</span>
                </div>
                <Progress value={zones.below_normal} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">{t('zones.normal')}</span>
                  <span className="text-sm font-semibold">{zones.normal}%</span>
                </div>
                <Progress value={zones.normal} className="h-2 [&>div]:bg-green-500" />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">{t('zones.optimal')}</span>
                  <span className="text-sm font-semibold">{zones.optimal}%</span>
                </div>
                <Progress value={zones.optimal} className="h-2 [&>div]:bg-blue-500" />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">{t('zones.aboveNormal')}</span>
                  <span className="text-sm font-semibold">{zones.above_normal}%</span>
                </div>
                <Progress value={zones.above_normal} className="h-2 [&>div]:bg-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('statistics.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('statistics.measurements')}</p>
                  <p className="text-2xl font-bold">{statistics.count}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('statistics.average')}</p>
                  <p className="text-2xl font-bold">{statistics.average}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('statistics.min')}</p>
                  <p className="text-2xl font-bold">{statistics.min}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('statistics.max')}</p>
                  <p className="text-2xl font-bold">{statistics.max}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time in Optimal Zone Card - only for quantitative data */}
          {!isQualitative && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  {t('optimalZone.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {timeInOptimalZone !== null ? (
                  <>
                    <div className="flex items-end gap-2">
                      <span className="text-5xl font-bold text-emerald-500">
                        {timeInOptimalZone}%
                      </span>
                      <span className="text-lg text-muted-foreground mb-2">
                        {t('optimalZone.yourMeasurements')}
                      </span>
                    </div>
                    <Progress 
                      value={timeInOptimalZone} 
                      className="h-3 [&>div]:bg-emerald-500 [&>div]:shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                    />
                    <p className="text-sm text-muted-foreground">
                      {timeInOptimalZone >= 80 
                        ? `🎉 ${t('optimalZone.excellent')}`
                        : timeInOptimalZone >= 50
                        ? `👍 ${t('optimalZone.good')}`
                        : `⚠️ ${t('optimalZone.needsAttention')}`
                      }
                    </p>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <Info className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {t('optimalZone.noData')}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSettings(true)}
                      className="mt-3 border-purple-500/50 hover:bg-purple-500/10"
                    >
                      {t('configureRange')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="relative pl-8">
            {history?.map((result, index) => {
              const isLatest = index === 0;
              return (
                <div key={result.id} className="relative pb-8">
                  {/* Timeline line */}
                  {index < history.length - 1 && (
                    <div className="absolute left-0 top-6 bottom-0 w-0.5 bg-border" />
                  )}
                  
                  {/* Timeline dot */}
                  <div className={cn(
                    "absolute left-0 top-2 w-4 h-4 rounded-full border-4 z-10",
                    isLatest ? "bg-primary border-primary shadow-glow-primary" : "bg-background border-border"
                  )} />
                  
                  {/* Content card */}
                  <Card className={cn(
                    "ml-6 p-4 transition-all",
                    isLatest && "border-primary border-2 bg-primary/5"
                  )}>
                    {isLatest && (
                      <Badge className="mb-2 bg-primary">{t('history.currentValue')}</Badge>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold">
                          {format(new Date(result.test_date), 'dd MMMM yyyy', { locale: ru })}
                        </p>
                        {result.raw_test_name !== biomarker.display_name && (
                          <p className="text-xs text-muted-foreground">
                            {t('history.originalName')}: {result.raw_test_name}
                          </p>
                        )}
                        {result.laboratory_name && (
                          <Badge variant="outline" className="text-xs">
                            🏥 {result.laboratory_name}
                          </Badge>
                        )}
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-2xl font-bold">{result.normalized_value} {result.normalized_unit}</p>
                        {result.value !== result.normalized_value && (
                          <p className="text-sm text-muted-foreground">
                            ({t('history.original')}: {result.value} {result.unit})
                          </p>
                        )}
                        {(result.ref_range_min !== null && result.ref_range_max !== null) && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground">{t('history.labReference')}</p>
                            <p className="text-sm font-medium">
                              {result.ref_range_min} - {result.ref_range_max} {result.ref_range_unit}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="about">
          <Card>
            <CardHeader>
              <CardTitle>{t('about.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">{t('about.referenceRanges')}</h3>
                <div className="space-y-1 text-sm">
                  <p>{t('about.normal')}: {reference_ranges.min} - {reference_ranges.max} {biomarker.unit}</p>
                  {reference_ranges.optimal_min && reference_ranges.optimal_max && (
                    <p>{t('about.optimal')}: {reference_ranges.optimal_min} - {reference_ranges.optimal_max} {biomarker.unit}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recommended Supplements Widget */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="mt-6"
      >
        <RecommendedSupplementsCard 
          biomarkerId={biomarkerId!}
          onAddToStack={(supplementName) => {
            const correlations = analysisAny?.correlations as any[] | undefined;
            const correlation = correlations?.find(
              (c: any) => c.supplement_name === supplementName
            );
            addToStack({
              supplementName,
              biomarkerId: biomarkerId!,
              biomarkerName: biomarker.display_name,
              expectedChange: correlation?.expected_change_percent,
              timeframeWeeks: correlation?.timeframe_weeks,
              rationale: correlation?.research_summary,
            });
          }}
        />
      </motion.div>

      {/* Settings Modal */}
      <BiomarkerSettingsModal
        open={showSettings}
        onOpenChange={setShowSettings}
        biomarkerId={biomarkerId!}
        biomarkerName={biomarker.name}
        unit={biomarker.unit}
        referenceMin={reference_ranges.min}
        referenceMax={reference_ranges.max}
        currentOptimalMin={reference_ranges.optimal_min}
        currentOptimalMax={reference_ranges.optimal_max}
      />
    </div>
  );
}
