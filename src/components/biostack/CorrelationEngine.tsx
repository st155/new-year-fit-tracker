import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupplementCorrelation } from '@/hooks/biostack/useSupplementCorrelation';
import { useAutoLinkBiomarkers, SupplementCorrelation } from '@/hooks/biostack/useAutoLinkBiomarkers';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, TrendingDown, Activity, Clock, Beaker, Link2, Sparkles, Brain } from 'lucide-react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SupplementResearchCard } from './SupplementResearchCard';
import { SupplementEffectivenessInsight, EffectivenessVerdict } from './SupplementEffectivenessInsight';
import { SupplementTimeline } from './SupplementTimeline';
import { AIEffectivenessAnalyzer } from './AIEffectivenessAnalyzer';
import { useTranslation } from 'react-i18next';

interface StackItem {
  id: string;
  stack_name: string;
  linked_biomarker_ids: string[];
  created_at?: string;
}

interface StackItemWithCorrelations extends StackItem {
  correlations?: SupplementCorrelation[];
  scientificName?: string;
  confidence?: number;
  timeframeWeeks?: number;
}

export function CorrelationEngine() {
  const { t } = useTranslation('supplements');
  const [selectedStackItemId, setSelectedStackItemId] = useState<string>();
  const [timeframe, setTimeframe] = useState<number>(6);
  const [stackItemsWithData, setStackItemsWithData] = useState<StackItemWithCorrelations[]>([]);
  const [selectedForAI, setSelectedForAI] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { mutateAsync: autoLink, isPending: isLinking } = useAutoLinkBiomarkers();

  // Fetch ALL active stack items (not just those with linked biomarkers)
  const { data: stackItems, isLoading: loadingStack, refetch } = useQuery({
    queryKey: ['active-stack-all'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_stack')
        .select('id, stack_name, linked_biomarker_ids, created_at')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;
      return (data || []) as StackItem[];
    },
  });

  // Fetch correlations for all supplements from biomarker_correlations
  const { data: allCorrelations } = useQuery({
    queryKey: ['all-biomarker-correlations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('biomarker_correlations')
        .select(`
          id,
          supplement_name,
          biomarker_id,
          correlation_type,
          expected_change_percent,
          evidence_level,
          research_summary,
          biomarker_master (
            id,
            display_name,
            canonical_name
          )
        `);

      if (error) throw error;
      return data || [];
    },
  });

  // Auto-link biomarkers for items that don't have them
  const handleAutoLinkAll = async () => {
    if (!stackItems) return;
    
    const itemsWithoutLinks = stackItems.filter(
      item => !item.linked_biomarker_ids || item.linked_biomarker_ids.length === 0
    );

    for (const item of itemsWithoutLinks) {
      try {
        await autoLink({ stackItemId: item.id, supplementName: item.stack_name });
      } catch (e) {
        console.error(`Failed to auto-link ${item.stack_name}:`, e);
      }
    }

    refetch();
  };

  // Enrich stack items with correlation data
  useEffect(() => {
    if (!stackItems || !allCorrelations) return;

    const enriched = stackItems.map(item => {
      // Find matching correlations by trying to match supplement name
      const normalizedName = item.stack_name.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      const matchingCorrelations = allCorrelations.filter(c => {
        const sciName = c.supplement_name.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Direct match
        if (normalizedName.includes(sciName) || sciName.includes(normalizedName)) return true;
        
        // Key ingredient match
        const keyTerms = ['magnesium', 'vitamin', 'omega', 'zinc', 'iron', 'calcium', 'b12', 'b6', 'folate', 'coq10', 'd3', 'berberine', 'ashwagandha', 'curcumin', 'melatonin'];
        return keyTerms.some(term => normalizedName.includes(term) && sciName.includes(term));
      });

      const correlations: SupplementCorrelation[] = matchingCorrelations.map(c => ({
        biomarkerName: (c.biomarker_master as any)?.display_name || (c.biomarker_master as any)?.canonical_name || 'Unknown',
        biomarkerId: c.biomarker_id || '',
        correlationType: c.correlation_type as 'increases' | 'decreases' | 'stabilizes',
        expectedChangePercent: c.expected_change_percent || 0,
        evidenceLevel: (c.evidence_level || 'low') as 'high' | 'moderate' | 'low',
        researchSummary: c.research_summary || '',
      }));

      // Get average timeframe from correlations
      const avgTimeframe = matchingCorrelations.length > 0
        ? Math.round(matchingCorrelations.reduce((sum, c) => sum + ((c as any).timeframe_weeks || 8), 0) / matchingCorrelations.length)
        : 8;

      return {
        ...item,
        correlations,
        scientificName: matchingCorrelations[0]?.supplement_name,
        confidence: matchingCorrelations.length > 0 ? 85 : 0,
        timeframeWeeks: avgTimeframe,
      };
    });

    setStackItemsWithData(enriched);
  }, [stackItems, allCorrelations]);

  const selectedItem = stackItemsWithData.find(i => i.id === selectedStackItemId);

  const { correlation, isLoading: loadingCorrelation } = useSupplementCorrelation(
    selectedStackItemId,
    timeframe
  );

  // Prepare chart data
  const chartData = correlation?.success && correlation.intakeData && correlation.biomarkerData
    ? prepareChartData(correlation.intakeData, correlation.biomarkerData)
    : [];

  if (loadingStack) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stackItems || stackItems.length === 0) {
    return (
      <Card className="p-8 bg-neutral-950 border-neutral-800">
        <div className="text-center space-y-4">
          <Activity className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold mb-2">{t('correlation.noActiveSupplements')}</h3>
            <p className="text-muted-foreground">
              {t('correlation.addToSeeCorrelations')}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const itemsWithCorrelations = stackItemsWithData.filter(i => i.correlations && i.correlations.length > 0);
  const itemsWithoutCorrelations = stackItemsWithData.filter(i => !i.correlations || i.correlations.length === 0);

  return (
    <div className="space-y-6">
      {/* Header with Auto-Link Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Beaker className="h-5 w-5 text-purple-400" />
            {t('correlation.scientificCorrelations')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('correlation.withScientificData', { count: itemsWithCorrelations.length, total: stackItems.length })}
          </p>
        </div>
        
        {itemsWithoutCorrelations.length > 0 && (
          <Button 
            onClick={handleAutoLinkAll}
            disabled={isLinking}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isLinking ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {t('correlation.linkAll', { count: itemsWithoutCorrelations.length })}
          </Button>
        )}
      </div>

      {/* Research Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {stackItemsWithData.map(item => (
          <SupplementResearchCard
            key={item.id}
            stackItemId={item.id}
            supplementName={item.stack_name}
            correlations={item.correlations}
            linkedBiomarkerIds={item.linked_biomarker_ids}
            scientificName={item.scientificName}
            confidence={item.confidence}
            onLinkComplete={() => {
              refetch();
              queryClient.invalidateQueries({ queryKey: ['all-biomarker-correlations'] });
            }}
          />
        ))}
      </div>

      {/* AI Effectiveness Analysis Section */}
      {user && stackItemsWithData.length > 0 && (
        <div className="border-t border-neutral-800 pt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-400" />
            {t('correlation.aiEffectivenessAnalysis')}
          </h3>
          
          {/* Selector for AI analysis */}
          <div className="mb-4">
            <Select value={selectedForAI || ''} onValueChange={setSelectedForAI}>
              <SelectTrigger className="bg-neutral-950 border-neutral-700 max-w-md">
                <SelectValue placeholder={t('correlation.selectForAIAnalysis')} />
              </SelectTrigger>
              <SelectContent>
                {stackItemsWithData.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.stack_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedForAI && (
            <AIEffectivenessAnalyzer
              stackItemId={selectedForAI}
              userId={user.id}
              supplementName={stackItemsWithData.find(i => i.id === selectedForAI)?.stack_name || ''}
            />
          )}
        </div>
      )}

      {/* Timeline Section */}
      {stackItemsWithData.filter(i => i.created_at && i.timeframeWeeks).length > 0 && (
        <div className="border-t border-neutral-800 pt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-400" />
            {t('correlation.effectTimeline')}
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {stackItemsWithData
              .filter(i => i.created_at && i.timeframeWeeks)
              .slice(0, 4)
              .map(item => (
                <SupplementTimeline
                  key={item.id}
                  supplementName={item.stack_name}
                  startDate={item.created_at!}
                  expectedEffectWeeks={item.timeframeWeeks || 8}
                />
              ))}
          </div>
        </div>
      )}

      {/* Detailed Analysis Section */}
      {itemsWithCorrelations.length > 0 && (
        <>
          <div className="border-t border-neutral-800 pt-6">
            <h3 className="text-lg font-semibold mb-4">{t('correlation.detailedAnalysis')}</h3>
            
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <Select value={selectedStackItemId} onValueChange={setSelectedStackItemId}>
                  <SelectTrigger className="bg-neutral-950 border-neutral-700 hover:border-purple-500 transition-colors">
                    <SelectValue placeholder={t('correlation.selectForAnalysis')} />
                  </SelectTrigger>
                  <SelectContent>
                    {itemsWithCorrelations.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        <div className="flex items-center gap-2">
                          <Link2 className="h-3 w-3 text-green-500" />
                          {item.stack_name}
                          <span className="text-xs text-muted-foreground">
                            ({t('correlation.correlations', { count: item.correlations?.length || 0 })})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-48">
                <Select value={timeframe.toString()} onValueChange={(v) => setTimeframe(parseInt(v))}>
                  <SelectTrigger className="bg-neutral-950 border-neutral-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">{t('correlation.months3')}</SelectItem>
                    <SelectItem value="6">{t('correlation.months6')}</SelectItem>
                    <SelectItem value="12">{t('correlation.months12')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loadingCorrelation && (
            <Card className="p-12 bg-neutral-950 border-neutral-800">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
                <p className="text-muted-foreground">🤖 {t('correlation.analyzingCorrelation')}</p>
              </div>
            </Card>
          )}

          {/* Error or No Data */}
          {correlation && !correlation.success && (
            <Card className="p-8 bg-neutral-950 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-amber-400">{t('correlation.insufficientData')}</h3>
                <p className="text-muted-foreground">{correlation.error}</p>
                <p className="text-sm text-muted-foreground">
                  {t('correlation.needIntakeAndBloodTests')}
                </p>
              </div>
            </Card>
          )}

          {/* Stats Cards */}
          {correlation?.success && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Biomarker Change */}
                <Card className="p-4 bg-neutral-950 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t('correlation.biomarkerChange')}</span>
                      {correlation.biomarker && correlation.biomarker.changePercent > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="text-2xl font-bold">
                      {correlation.biomarker?.changePercent > 0 ? '+' : ''}
                      {correlation.biomarker?.changePercent}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {correlation.biomarker?.startValue} → {correlation.biomarker?.endValue} {correlation.biomarker?.unit}
                    </div>
                  </div>
                </Card>

                {/* Intake Consistency */}
                <Card className="p-4 bg-neutral-950 border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t('correlation.intakeConsistency')}</span>
                      <Activity className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold">{correlation.avgConsistency}%</div>
                    <div className="text-xs text-muted-foreground">
                      {t('correlation.overMonths', { count: timeframe })}
                    </div>
                  </div>
                </Card>

                {/* Correlation Score */}
                <Card className="p-4 bg-neutral-950 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t('correlation.correlation')}</span>
                      <Badge variant={
                        correlation.correlation && correlation.correlation.score > 0.7 ? 'default' :
                        correlation.correlation && correlation.correlation.score > 0.5 ? 'secondary' : 'outline'
                      }>
                        {correlation.correlation?.score.toFixed(2)}
                      </Badge>
                    </div>
                    <div className="text-lg font-semibold">
                      {correlation.correlation?.interpretation}
                    </div>
                  </div>
                </Card>

                {/* Time to Effect */}
                {correlation.timeToEffect && (
                  <Card className="p-4 bg-neutral-950 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('correlation.timeToEffect')}</span>
                        <Clock className="h-4 w-4 text-amber-500" />
                      </div>
                      <div className="text-2xl font-bold">{t('correlation.weeks', { count: correlation.timeToEffect.weeks })}</div>
                      <div className="text-xs text-muted-foreground">
                        {correlation.timeToEffect.description}
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              {/* Chart */}
              {chartData.length > 0 && (
                <Card className="p-6 bg-neutral-950 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">
                        {correlation.biomarker?.name} — {t('correlation.correlation')}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t('correlation.biomarkerVsConsistency')}
                      </p>
                    </div>
                    
                    <ResponsiveContainer width="100%" height={400}>
                      <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted) / 0.2)" />
                        <XAxis 
                          dataKey="week" 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                        />
                        <YAxis 
                          yAxisId="left"
                          stroke="#a855f7"
                          label={{ value: `${correlation.biomarker?.name} (${correlation.biomarker?.unit})`, angle: -90, position: 'insideLeft', style: { fill: '#a855f7' } }}
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          stroke="#22c55e"
                          label={{ value: t('correlation.consistencyPercent'), angle: 90, position: 'insideRight', style: { fill: '#22c55e' } }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                        <Bar 
                          yAxisId="right"
                          dataKey="consistency" 
                          fill="#22c55e"
                          fillOpacity={0.6}
                          name={t('correlation.consistencyPercent')}
                        />
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="biomarkerValue" 
                          stroke="#a855f7"
                          strokeWidth={3}
                          dot={{ fill: '#a855f7', r: 6 }}
                          name={`${correlation.biomarker?.name}`}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}

              {/* AI Insights - Enhanced with new component */}
              {correlation.aiInsights && (
                <SupplementEffectivenessInsight
                  supplementName={selectedItem?.stack_name || 'Supplement'}
                  expectedChange={
                    selectedItem?.correlations?.[0] ? {
                      biomarker: selectedItem.correlations[0].biomarkerName,
                      percent: selectedItem.correlations[0].expectedChangePercent,
                      timeframeWeeks: selectedItem.timeframeWeeks,
                    } : undefined
                  }
                  actualChange={
                    correlation.biomarker ? {
                      biomarker: correlation.biomarker.name,
                      percent: correlation.biomarker.changePercent,
                      startValue: correlation.biomarker.startValue,
                      endValue: correlation.biomarker.endValue,
                      unit: correlation.biomarker.unit,
                    } : undefined
                  }
                  verdict={
                    correlation.aiInsights.is_effective ? 'effective' :
                    (correlation.correlation?.score || 0) > 0.3 ? 'needs_more_time' : 'not_working'
                  }
                  weeksOnSupplement={timeframe * 4}
                />
              )}

              {/* Legacy AI Insights Card */}
              {correlation.aiInsights && !selectedItem?.correlations?.[0] && (
                <Card className={`p-6 bg-neutral-950 ${
                  correlation.aiInsights.is_effective 
                    ? 'border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                    : 'border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                }`}>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold mb-1">{t('correlation.aiAnalysis')}</h3>
                        <Badge variant={correlation.aiInsights.confidence_level === 'high' ? 'default' : 'secondary'}>
                          {correlation.aiInsights.confidence_level === 'high' ? t('correlation.highConfidence') : t('correlation.mediumConfidence')}
                        </Badge>
                      </div>
                      {correlation.aiInsights.is_effective && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          {t('correlation.effective')}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">{t('correlation.keyInsight')}</p>
                        <p className="text-base">{correlation.aiInsights.key_insight}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">{t('correlation.recommendation')}</p>
                        <p className="text-base text-primary">{correlation.aiInsights.recommendation}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function prepareChartData(
  intakeData: Array<{ week: string; avgConsistency: number }>,
  biomarkerData: Array<{ date: string; value: number }>
) {
  const weekMap = new Map(intakeData.map(d => [d.week, d.avgConsistency]));
  
  const biomarkerMap = new Map<string, number>();
  biomarkerData.forEach(b => {
    const date = new Date(b.date);
    const weekKey = getWeekKey(date);
    biomarkerMap.set(weekKey, b.value);
  });
  
  const weeks = Array.from(weekMap.keys()).sort();
  let lastBiomarkerValue: number | null = null;
  
  return weeks.map(week => {
    const biomarkerValue = biomarkerMap.get(week);
    if (biomarkerValue !== undefined) {
      lastBiomarkerValue = biomarkerValue;
    }
    
    return {
      week,
      consistency: weekMap.get(week) || 0,
      biomarkerValue: lastBiomarkerValue,
    };
  }).filter(d => d.biomarkerValue !== null);
}

function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
