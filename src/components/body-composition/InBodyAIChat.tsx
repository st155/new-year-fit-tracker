import { useState } from "react";
import { Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { aiApi } from "@/lib/api/client";
import { useToast } from "@/hooks/use-toast";

interface InBodyAIChatProps {
  analysisId: string;
}

const PRESET_QUESTIONS = [
  "Почему мои руки развиты больше нормы?",
  "Как снизить висцеральный жир?",
  "Какие упражнения для баланса нижней части тела?",
  "Достаточно ли я получаю протеина?",
  "Оптимально ли мое соотношение воды?",
  "Какие тренировки лучше для моего состава тела?",
  "Сколько белка мне нужно для роста мышц?",
  "Какая реалистичная цель на 3 месяца?",
];

export function InBodyAIChat({ analysisId }: InBodyAIChatProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const askQuestion = async (q: string) => {
    setLoading(true);
    setQuestion(q);
    setAnswer("");

    try {
      const { data, error } = await aiApi.askAboutInBody(analysisId, q);

      if (error) throw error;

      setAnswer(data?.answer || '');
    } catch (error) {
      console.error('Error asking question:', error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось получить ответ от AI",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <h2 className="text-lg font-semibold metric-glow">СПРОСИТЬ AI</h2>
      </div>

      {/* Preset Questions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {PRESET_QUESTIONS.map((q, idx) => (
          <Button
            key={idx}
            variant="outline"
            className="justify-start text-left h-auto py-2 px-3 text-sm"
            onClick={() => askQuestion(q)}
            disabled={loading}
          >
            {q}
          </Button>
        ))}
      </div>

      {/* Custom Question */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Textarea
            placeholder="Или задайте свой вопрос..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={loading}
            className="min-h-[80px]"
          />
          <Button
            onClick={() => askQuestion(question)}
            disabled={loading || !question.trim()}
            size="icon"
            className="h-[80px] w-[80px]"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Answer */}
      {answer && (
        <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-indigo-600/10 border-purple-500/20">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{answer}</p>
        </Card>
      )}
    </div>
  );
}
