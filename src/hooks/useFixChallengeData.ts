import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useFixChallengeData() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('fix-challenge-data', {
        body: {}
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Данные исправлены",
        description: `Обновлено: ${data.operations.disciplinePositionsFixed} позиций дисциплин, удалено ${data.operations.duplicateGoalsDeleted} дубликатов целей, активировано ${data.operations.terraTokensActivated} токенов`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка исправления данных",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
