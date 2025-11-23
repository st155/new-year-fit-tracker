import { useState } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2 } from 'lucide-react';
import { useBiomarkers, LabTestResult } from '@/hooks/useBiomarkers';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { cn } from '@/lib/utils';

interface BiomarkerMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unmatchedResults: LabTestResult[];
}

function normalizeBiomarkerName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function detectLanguage(text: string): string {
  const cyrillicPattern = /[а-яА-ЯёЁ]/;
  const frenchPattern = /[éèêëàâôûùç]/i;
  
  if (cyrillicPattern.test(text)) return 'ru';
  if (frenchPattern.test(text)) return 'fr';
  return 'en';
}

export function BiomarkerMappingDialog({ open, onOpenChange, unmatchedResults }: BiomarkerMappingDialogProps) {
  const { biomarkers } = useBiomarkers();
  const queryClient = useQueryClient();
  const [selectedResult, setSelectedResult] = useState<LabTestResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleMatch = async (resultId: string, biomarkerId: string, rawTestName: string) => {
    setIsSaving(true);
    
    try {
      // 1. Update lab_test_results
      const { error: updateError } = await supabase
        .from('lab_test_results')
        .update({ biomarker_id: biomarkerId })
        .eq('id', resultId);

      if (updateError) throw updateError;

      // 2. Create new alias (система автообучается)
      const normalizedName = normalizeBiomarkerName(rawTestName);
      const language = detectLanguage(rawTestName);

      const { error: aliasError } = await supabase
        .from('biomarker_aliases')
        .insert({
          biomarker_id: biomarkerId,
          alias: rawTestName,
          alias_normalized: normalizedName,
          language,
          source: 'user_mapping'
        });

      // Ignore duplicate key errors (alias already exists)
      if (aliasError && !aliasError.message.includes('duplicate key')) {
        console.warn('Failed to create alias:', aliasError);
      }

      // 3. Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['lab-test-results'] });
      queryClient.invalidateQueries({ queryKey: ['biomarker-history', biomarkerId] });
      queryClient.invalidateQueries({ queryKey: ['biomarker-trends', biomarkerId] });

      showSuccessToast('Биомаркер сопоставлен', 'Система запомнила это соответствие для будущих документов');
      
      setSelectedResult(null);
      setSearchQuery('');
      
      // Close dialog if all are matched
      if (unmatchedResults.length === 1) {
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('Error matching biomarker:', error);
      showErrorToast('Ошибка сопоставления', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Сопоставление биомаркеров</DialogTitle>
          <DialogDescription>
            Выберите несопоставленный показатель слева и найдите соответствующий биомаркер справа
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
          {/* Left: Unmatched results list */}
          <div className="border rounded-lg p-4 space-y-2 overflow-y-auto">
            <h3 className="font-semibold text-sm text-muted-foreground mb-3">
              Несопоставленные показатели ({unmatchedResults.length})
            </h3>
            {unmatchedResults.map(result => (
              <button
                key={result.id}
                onClick={() => {
                  setSelectedResult(result);
                  setSearchQuery(result.raw_test_name);
                }}
                className={cn(
                  'w-full text-left p-3 rounded-lg border transition-all hover:bg-muted',
                  selectedResult?.id === result.id && 'bg-primary/10 border-primary'
                )}
              >
                <p className="font-medium">{result.raw_test_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {result.value} {result.unit}
                  </Badge>
                  {result.laboratory_name && (
                    <span className="text-xs text-muted-foreground">{result.laboratory_name}</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Right: Biomarker search */}
          <div className="border rounded-lg p-4 flex flex-col overflow-hidden">
            <h3 className="font-semibold text-sm text-muted-foreground mb-3">
              {selectedResult ? `Сопоставить с: ${selectedResult.raw_test_name}` : 'Выберите показатель слева'}
            </h3>
            
            {selectedResult && (
              <Command className="flex-1 overflow-hidden">
                <CommandInput
                  placeholder="Поиск по базе биомаркеров..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <CommandEmpty>Биомаркеры не найдены</CommandEmpty>
                <CommandGroup className="overflow-y-auto max-h-[400px]">
                  {biomarkers
                    ?.filter(b => 
                      searchQuery === '' ||
                      b.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      b.canonical_name.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map(biomarker => (
                      <CommandItem
                        key={biomarker.id}
                        onSelect={() => handleMatch(selectedResult.id, biomarker.id, selectedResult.raw_test_name)}
                        className="flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{biomarker.display_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {biomarker.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{biomarker.standard_unit}</span>
                          </div>
                        </div>
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 opacity-0 group-hover:opacity-100" />
                        )}
                      </CommandItem>
                    ))}
                </CommandGroup>
              </Command>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
