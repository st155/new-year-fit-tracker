import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingDown, Activity, Clock, CheckCircle2, AlertCircle, Package, Library } from 'lucide-react';
import { useGenerateRecommendations, useAddRecommendationsToStack } from '@/hooks/biostack/useAIStackGenerator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useSupplementLibrary } from '@/hooks/biostack/useSupplementLibrary';

interface AIStackGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AIStackGenerator({ open, onOpenChange, onSuccess }: AIStackGeneratorProps) {
  const [selectedRecommendations, setSelectedRecommendations] = useState<Set<number>>(new Set());
  const [showDeficiencies, setShowDeficiencies] = useState(true);

  const generateMutation = useGenerateRecommendations();
  const addToStackMutation = useAddRecommendationsToStack();
  const { data: library } = useSupplementLibrary();

  const data = generateMutation.data;
  const recommendations = data?.recommendations || [];
  const deficiencies = data?.deficiencies || [];
  const analysis = data?.analysis;

  // Check which recommendations are in library
  const libraryProductNames = new Set(
    library?.map(entry => entry.supplement_products.name.toLowerCase()) || []
  );

  const handleGenerate = () => {
    setSelectedRecommendations(new Set());
    generateMutation.mutate();
  };

  const toggleSelection = (index: number) => {
    const newSet = new Set(selectedRecommendations);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedRecommendations(newSet);
  };

  const handleSelectAll = () => {
    if (selectedRecommendations.size === recommendations.length) {
      setSelectedRecommendations(new Set());
    } else {
      setSelectedRecommendations(new Set(recommendations.map((_, i) => i)));
    }
  };

  const handleAddToStack = async () => {
    const selected = recommendations.filter((_, i) => selectedRecommendations.has(i));
    await addToStackMutation.mutateAsync({ recommendations: selected, deficiencies });
    onSuccess?.();
    onOpenChange(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'low':
        return 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]';
      case 'suboptimal':
        return 'border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]';
      default:
        return 'border-neutral-700';
    }
  };

  const getEvidenceColor = (level: string) => {
    if (!level) return 'border-blue-500';
    const lower = level.toLowerCase();
    if (lower.includes('high') || lower.includes('strong')) {
      return 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]';
    }
    if (lower.includes('moderate') || lower.includes('medium')) {
      return 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]';
    }
    return 'border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-neutral-950 border-neutral-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-green-500" />
            AI Stack Generator
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Персонализированные рекомендации на основе ваших анализов крови
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          {/* Initial State - No Analysis */}
          {!generateMutation.data && !generateMutation.isPending && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-green-500" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">Готовы к персонализированным рекомендациям?</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Наш AI проанализирует ваши последние анализы крови и подберет добавки для устранения дефицитов
                </p>
              </div>
              <Button
                onClick={handleGenerate}
                size="lg"
                className="bg-green-600 hover:bg-green-700"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Анализировать мои анализы
              </Button>
            </div>
          )}

          {/* Loading State */}
          {generateMutation.isPending && (
            <div className="space-y-6">
              <div className="text-center space-y-4 py-8">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto animate-pulse">
                  <Sparkles className="h-8 w-8 text-green-500 animate-spin" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Анализируем ваши анализы крови...</h3>
                  <p className="text-sm text-muted-foreground">Это может занять 10-15 секунд</p>
                </div>
              </div>
              <div className="space-y-4">
                <Skeleton className="h-24 w-full bg-neutral-900" />
                <Skeleton className="h-32 w-full bg-neutral-900" />
                <Skeleton className="h-32 w-full bg-neutral-900" />
              </div>
            </div>
          )}

          {/* Error States */}
          {data?.error === 'no_blood_work' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <AlertCircle className="h-12 w-12 text-yellow-500" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Анализы крови не найдены</h3>
                <p className="text-sm text-muted-foreground">
                  Загрузите анализы крови в раздел Мед.Док., чтобы получить персонализированные рекомендации
                </p>
              </div>
              <Button onClick={() => onOpenChange(false)} variant="outline">
                Перейти к Мед.Док.
              </Button>
            </div>
          )}

          {data?.no_deficiencies && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Отличные результаты!</h3>
                <p className="text-sm text-muted-foreground">
                  Все ваши биомаркеры в оптимальном диапазоне. Продолжайте в том же духе!
                </p>
                <p className="text-xs text-muted-foreground">
                  Проанализировано биомаркеров: {analysis?.total_biomarkers}
                </p>
              </div>
            </div>
          )}

          {data?.error === 'no_correlations' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Package className="h-12 w-12 text-yellow-500" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">База данных не заполнена</h3>
                <p className="text-sm text-muted-foreground">
                  Необходимо заполнить базу корреляций добавок с биомаркерами
                </p>
              </div>
            </div>
          )}

          {/* Success State with Recommendations */}
          {data?.success && recommendations.length > 0 && (
            <div className="space-y-6">
              {/* Analysis Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/50">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Activity className="h-4 w-4" />
                    Проанализировано
                  </div>
                  <div className="text-2xl font-bold">{analysis?.total_biomarkers}</div>
                </div>
                <div className="p-4 rounded-lg border border-red-500/50 bg-red-500/5">
                  <div className="flex items-center gap-2 text-sm text-red-400 mb-1">
                    <TrendingDown className="h-4 w-4" />
                    Дефициты
                  </div>
                  <div className="text-2xl font-bold text-red-500">{analysis?.deficiencies_count}</div>
                </div>
                <div className="p-4 rounded-lg border border-green-500/50 bg-green-500/5">
                  <div className="flex items-center gap-2 text-sm text-green-400 mb-1">
                    <Sparkles className="h-4 w-4" />
                    Рекомендации
                  </div>
                  <div className="text-2xl font-bold text-green-500">{analysis?.recommendations_count}</div>
                </div>
              </div>

              {/* Deficiencies List (Collapsible) */}
              {deficiencies.length > 0 && (
                <Collapsible open={showDeficiencies} onOpenChange={setShowDeficiencies}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 transition-colors">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-red-500" />
                      <span className="font-semibold">Обнаруженные дефициты</span>
                      <Badge variant="destructive" className="ml-2">{deficiencies.length}</Badge>
                    </div>
                    <ChevronDown className={`h-5 w-5 transition-transform ${showDeficiencies ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    {deficiencies.map((def, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border ${getStatusColor(def.status)} bg-neutral-900/50`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold">{def.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {def.current_value} {def.unit} (Норма: {def.ref_min}-{def.ref_max})
                            </div>
                          </div>
                          <Badge variant={def.status === 'low' ? 'destructive' : 'secondary'}>
                            {def.status === 'low' ? 'Низкий' : 'Субоптимальный'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Recommendations */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Персонализированные рекомендации</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    {selectedRecommendations.size === recommendations.length ? 'Снять все' : 'Выбрать все'}
                  </Button>
                </div>

                {recommendations.map((rec, idx) => {
                  const isInLibrary = libraryProductNames.has(rec.supplement_name.toLowerCase());
                  
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border ${
                        isInLibrary 
                          ? 'border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]' 
                          : 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                      } bg-neutral-900/50 hover:bg-neutral-900 transition-all cursor-pointer`}
                      onClick={() => toggleSelection(idx)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedRecommendations.has(idx)}
                          onCheckedChange={() => toggleSelection(idx)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-3">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-lg">{rec.supplement_name}</h4>
                                {isInLibrary ? (
                                  <Badge className="bg-green-500/20 text-green-500 border-green-500/50 text-xs">
                                    <Library className="h-3 w-3 mr-1" />
                                    In Library
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs border-blue-500 text-blue-500">
                                    🆕 New
                                  </Badge>
                                )}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {rec.dosage_amount} {rec.dosage_unit}
                              </Badge>
                            </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <span className="capitalize">{rec.form}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {rec.intake_times.map(t => 
                                t === 'morning' ? 'Утро' : t === 'afternoon' ? 'День' : t === 'evening' ? 'Вечер' : 'По необходимости'
                              ).join(', ')}
                            </span>
                          </div>
                        </div>

                        <div className="text-sm leading-relaxed">
                          {rec.rationale}
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <TrendingDown className="h-4 w-4 text-green-500" />
                            <span className="text-muted-foreground">
                              +{rec.expected_improvement}% за {rec.timeframe_weeks} недель
                            </span>
                          </div>
                        </div>

                        {rec.synergies && rec.synergies.length > 0 && (
                          <div className="pt-2 border-t border-neutral-800">
                            <div className="text-xs text-muted-foreground mb-1">Синергия с:</div>
                            <div className="flex flex-wrap gap-2">
                              {rec.synergies.map((syn, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {syn}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer Actions */}
        {data?.success && recommendations.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
            <div className="text-sm text-muted-foreground">
              Выбрано: {selectedRecommendations.size} из {recommendations.length}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button
                onClick={handleAddToStack}
                disabled={selectedRecommendations.size === 0 || addToStackMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <Package className="mr-2 h-4 w-4" />
                Добавить в стек ({selectedRecommendations.size})
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
