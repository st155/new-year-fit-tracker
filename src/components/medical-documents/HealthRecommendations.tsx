import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, Lightbulb, Calendar } from "lucide-react";

export const HealthRecommendations = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendations, setRecommendations] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const { toast } = useToast();

  const generateRecommendations = async () => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-health-recommendations', {
        body: {}
      });

      if (error) throw error;

      setRecommendations(data.recommendations);
      setMetadata(data.context);
      
      toast({
        title: "Рекомендации готовы",
        description: "AI проанализировал все ваши данные"
      });
    } catch (error: any) {
      console.error('Recommendations error:', error);
      toast({
        title: "Ошибка генерации",
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
              AI Рекомендации
            </CardTitle>
            <CardDescription>
              Персональные советы на основе всех ваших данных
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
                Анализ...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Сгенерировать
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {!recommendations && !isGenerating && (
          <div className="text-center py-12 text-muted-foreground">
            <Lightbulb className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="mb-2">Получите персональные рекомендации</p>
            <p className="text-sm">
              AI проанализирует все ваши документы, цели и измерения
            </p>
          </div>
        )}

        {isGenerating && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">Анализируем ваши данные...</p>
          </div>
        )}

        {recommendations && metadata && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {metadata.documentsAnalyzed} документов
              </Badge>
              <Badge variant="secondary">
                {metadata.goalsConsidered} целей
              </Badge>
              <Badge variant="secondary">
                {metadata.measurementsReviewed} измерений
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
              <span>Сгенерировано: {new Date().toLocaleString('ru-RU')}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
