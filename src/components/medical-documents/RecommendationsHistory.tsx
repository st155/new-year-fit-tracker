import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecommendationsHistory } from "@/hooks/medical-documents/useRecommendationsHistory";
import { Sparkles, Loader2, Lightbulb, Calendar, ChevronRight, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';

export const RecommendationsHistory = () => {
  const { t } = useTranslation('medicalDocs');
  const { history, isLoading, generateRecommendation, recalculateUnits } = useRecommendationsHistory();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedRec = history?.find(h => h.id === selectedId) || history?.[0];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      {/* Left: History List */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            {t('recommendations.history', 'Recommendations History')}
          </CardTitle>
          <CardDescription>
            {t('recommendations.savedCount', { count: history?.length || 0 })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-3">
            <div className="space-y-2">
              {history?.map(rec => (
                <motion.div
                  key={rec.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant={selectedId === rec.id ? "secondary" : "ghost"}
                    className="w-full justify-between h-auto py-3 px-3"
                    onClick={() => setSelectedId(rec.id)}
                  >
                    <div className="flex flex-col items-start gap-1">
                      <div className="text-sm font-medium">
                        {new Date(rec.generated_at).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      {rec.health_score && (
                        <Badge variant="outline" className="text-xs">
                          {t('recommendations.score', { score: rec.health_score })}
                        </Badge>
                      )}
                    </div>
                    {selectedId === rec.id && (
                      <ChevronRight className="h-4 w-4 text-primary" />
                    )}
                  </Button>
                </motion.div>
              ))}
            </div>
          </ScrollArea>

          <Button
            onClick={() => recalculateUnits.mutate()}
            disabled={recalculateUnits.isPending}
            variant="outline"
            className="w-full mt-4 gap-2 border-orange-500/30 hover:bg-orange-500/10"
          >
            {recalculateUnits.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('recommendations.recalculating', 'Recalculating...')}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                {t('recommendations.refreshData', '🔄 Refresh data')}
              </>
            )}
          </Button>

          <Button
            onClick={async () => {
              // First recalculate units
              try {
                await recalculateUnits.mutateAsync();
              } catch (error) {
                console.error('Unit recalculation failed:', error);
              }
              // Then generate recommendations
              generateRecommendation.mutate();
            }}
            disabled={generateRecommendation.isPending || recalculateUnits.isPending}
            className="w-full mt-2 gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
          >
            {recalculateUnits.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('recommendations.recalculatingUnits', 'Recalculating units...')}
              </>
            ) : generateRecommendation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('recommendations.analyzing')}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {t('recommendations.generateNew', 'Generate new')}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Right: Selected Recommendation */}
      <Card className="border-purple-500/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-purple-500" />
                {t('recommendations.title')}
              </CardTitle>
              <CardDescription>
                {selectedRec
                  ? t('recommendations.from', { date: new Date(selectedRec.generated_at).toLocaleString() })
                  : t('recommendations.clickGenerate', 'Click "Generate new" to get recommendations')}
              </CardDescription>
            </div>
            {selectedRec?.health_score && (
              <Badge className="text-lg px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30">
                {selectedRec.health_score}/100
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {!selectedRec && !history?.length ? (
            <div className="text-center py-16 text-muted-foreground">
              <Lightbulb className="h-20 w-20 mx-auto mb-4 opacity-30" />
              <p className="text-lg mb-2">{t('recommendations.emptyTitle')}</p>
              <p className="text-sm">
                {t('recommendations.emptyDesc')}
              </p>
            </div>
          ) : selectedRec ? (
            <div className="space-y-4">
              {selectedRec.context_snapshot && (
                <div className="flex flex-wrap gap-2">
                  {selectedRec.context_snapshot.documents_analyzed && (
                    <Badge variant="secondary" className="gap-1">
                      <span className="text-primary">📄</span>
                      {t('recommendations.documents', { count: selectedRec.context_snapshot.documents_analyzed })}
                    </Badge>
                  )}
                  {selectedRec.context_snapshot.biomarkers_count && (
                    <Badge variant="secondary" className="gap-1">
                      <span className="text-primary">🧪</span>
                      {t('recommendations.biomarkers', { count: selectedRec.context_snapshot.biomarkers_count })}
                    </Badge>
                  )}
                </div>
              )}

              <ScrollArea className="h-[520px] pr-4">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap bg-accent/20 border border-primary/10 p-6 rounded-lg">
                    {selectedRec.recommendations_text}
                  </div>
                </div>
              </ScrollArea>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};
