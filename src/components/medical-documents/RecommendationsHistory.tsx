import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecommendationsHistory } from "@/hooks/medical-documents/useRecommendationsHistory";
import { Sparkles, Loader2, Lightbulb, Calendar, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export const RecommendationsHistory = () => {
  const { history, isLoading, generateRecommendation } = useRecommendationsHistory();
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
            История рекомендаций
          </CardTitle>
          <CardDescription>
            {history?.length || 0} сохранённых генераций
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
                          Оценка: {rec.health_score}/10
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
            onClick={() => generateRecommendation.mutate()}
            disabled={generateRecommendation.isPending}
            className="w-full mt-4 gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
          >
            {generateRecommendation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Генерация...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Сгенерировать новый
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
                AI Рекомендации
              </CardTitle>
              <CardDescription>
                {selectedRec
                  ? `От ${new Date(selectedRec.generated_at).toLocaleString('ru-RU')}`
                  : 'Нажмите "Сгенерировать новый" для получения рекомендаций'}
              </CardDescription>
            </div>
            {selectedRec?.health_score && (
              <Badge className="text-lg px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30">
                {selectedRec.health_score}/10
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {!selectedRec && !history?.length ? (
            <div className="text-center py-16 text-muted-foreground">
              <Lightbulb className="h-20 w-20 mx-auto mb-4 opacity-30" />
              <p className="text-lg mb-2">Получите персональные рекомендации</p>
              <p className="text-sm">
                AI проанализирует все ваши документы, цели и измерения
              </p>
            </div>
          ) : selectedRec ? (
            <div className="space-y-4">
              {selectedRec.context_snapshot && (
                <div className="flex flex-wrap gap-2">
                  {selectedRec.context_snapshot.documents_analyzed && (
                    <Badge variant="secondary" className="gap-1">
                      <span className="text-primary">📄</span>
                      {selectedRec.context_snapshot.documents_analyzed} документов
                    </Badge>
                  )}
                  {selectedRec.context_snapshot.biomarkers_count && (
                    <Badge variant="secondary" className="gap-1">
                      <span className="text-primary">🧪</span>
                      {selectedRec.context_snapshot.biomarkers_count} биомаркеров
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
