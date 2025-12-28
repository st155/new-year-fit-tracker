import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { healthApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, Lightbulb, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";

export const HealthRecommendations = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendations, setRecommendations] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const { toast } = useToast();
  const { t, i18n } = useTranslation('medicalDocs');

  const generateRecommendations = async () => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await healthApi.generateRecommendations();

      if (error) throw error;

      setRecommendations(data?.recommendations || null);
      setMetadata(data?.context);
      
      toast({
        title: t('recommendations.ready'),
        description: t('recommendations.readyDesc')
      });
    } catch (error: any) {
      console.error('Recommendations error:', error);
      toast({
        title: t('recommendations.error'),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              {t('recommendations.title')}
            </CardTitle>
            <CardDescription>
              {t('recommendations.subtitle')}
            </CardDescription>
          </div>
          <Button 
            onClick={generateRecommendations}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('recommendations.analyzing')}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {t('recommendations.generate')}
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {!recommendations && !isGenerating && (
          <div className="text-center py-12 text-muted-foreground">
            <Lightbulb className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="mb-2">{t('recommendations.emptyTitle')}</p>
            <p className="text-sm">
              {t('recommendations.emptyDesc')}
            </p>
          </div>
        )}

        {isGenerating && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">{t('recommendations.loading')}</p>
          </div>
        )}

        {recommendations && metadata && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {t('recommendations.documents', { count: metadata.documentsAnalyzed })}
              </Badge>
              <Badge variant="secondary">
                {t('recommendations.goals', { count: metadata.goalsConsidered })}
              </Badge>
              <Badge variant="secondary">
                {t('recommendations.measurements', { count: metadata.measurementsReviewed })}
              </Badge>
            </div>

            <ScrollArea className="h-[600px] pr-4">
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap bg-accent/30 p-4 rounded-lg">
                  {recommendations}
                </div>
              </div>
            </ScrollArea>

            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4 border-t">
              <Calendar className="h-4 w-4" />
              <span>{t('recommendations.generatedAt')}: {new Date().toLocaleString(i18n.language === 'ru' ? 'ru-RU' : 'en-US')}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
