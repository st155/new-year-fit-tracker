import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, Sparkles, TrendingUp, Loader2, FileText, Calendar } from "lucide-react";
import { InBodyUpload } from "@/components/body-composition/InBodyUpload";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function Body() {
  const [showUpload, setShowUpload] = useState(false);
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  // Получаем все InBody анализы пользователя
  const { data: inbodyAnalyses, refetch } = useQuery({
    queryKey: ['inbody-analyses', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      
      const { data, error } = await supabase
        .from('inbody_analyses')
        .select('*')
        .eq('user_id', session.user.id)
        .order('test_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!session?.user?.id,
  });

  const latestAnalysis = inbodyAnalyses?.[0];

  const handleAIAnalysis = async () => {
    if (!session?.user) {
      toast({
        title: "Ошибка",
        description: "Необходимо авторизоваться",
        variant: "destructive",
      });
      return;
    }

    if (!inbodyAnalyses || inbodyAnalyses.length === 0) {
      toast({
        title: "Нет данных",
        description: "Загрузите хотя бы один файл InBody для анализа",
        variant: "destructive",
      });
      return;
    }

    setAnalyzingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-inbody', {
        body: {},
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setAiAnalysis(data.analysis);
      toast({
        title: "Анализ готов",
        description: `Проанализировано ${data.measurementsCount} измерений`,
      });
    } catch (error: any) {
      console.error('AI analysis error:', error);
      toast({
        title: "Ошибка анализа",
        description: error.message || "Не удалось выполнить AI анализ",
        variant: "destructive",
      });
    } finally {
      setAnalyzingAI(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Body</h1>
          <p className="text-muted-foreground">
            Анализ состава тела InBody с AI-рекомендациями
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleAIAnalysis} 
            disabled={analyzingAI || !inbodyAnalyses || inbodyAnalyses.length === 0}
            variant="outline"
          >
            {analyzingAI ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Анализируем...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                AI Анализ
              </>
            )}
          </Button>
          <Button onClick={() => setShowUpload(!showUpload)}>
            <Upload className="mr-2 h-4 w-4" />
            Загрузить InBody
          </Button>
        </div>
      </div>

      {/* Статистика по загруженным файлам */}
      {inbodyAnalyses && inbodyAnalyses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Всего измерений
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{inbodyAnalyses.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Последнее измерение
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">
                {latestAnalysis && format(new Date(latestAnalysis.test_date), 'd MMMM yyyy', { locale: ru })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Текущий вес
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {latestAnalysis?.weight ? `${latestAnalysis.weight} кг` : '—'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showUpload && (
        <Card>
          <CardHeader>
            <CardTitle>Загрузить InBody PDF</CardTitle>
            <CardDescription>
              Загрузите PDF-файл с результатами измерений InBody
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InBodyUpload
              onSuccess={() => {
                setShowUpload(false);
                refetch();
                toast({
                  title: "Успешно",
                  description: "Данные InBody загружены",
                });
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* AI Анализ */}
      {aiAnalysis && (
        <Card className="border-primary/50 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>AI Анализ прогрессии</CardTitle>
            </div>
            <CardDescription>
              {inbodyAnalyses && inbodyAnalyses.length > 1 
                ? `Анализ на основе ${inbodyAnalyses.length} измерений`
                : 'Анализ текущего состояния'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {aiAnalysis}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="latest" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="latest">
            <TrendingUp className="mr-2 h-4 w-4" />
            Последний результат
          </TabsTrigger>
          <TabsTrigger value="history">
            <Calendar className="mr-2 h-4 w-4" />
            История ({inbodyAnalyses?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="latest" className="space-y-4">
          {latestAnalysis ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Основные показатели</CardTitle>
                  <CardDescription>
                    Измерение от {format(new Date(latestAnalysis.test_date), 'd MMMM yyyy', { locale: ru })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Вес</p>
                      <p className="text-2xl font-bold">{latestAnalysis.weight || '—'} <span className="text-sm font-normal">кг</span></p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">% жира</p>
                      <p className="text-2xl font-bold">{latestAnalysis.percent_body_fat || '—'} <span className="text-sm font-normal">%</span></p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Мышцы</p>
                      <p className="text-2xl font-bold">{latestAnalysis.skeletal_muscle_mass || '—'} <span className="text-sm font-normal">кг</span></p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">BMI</p>
                      <p className="text-2xl font-bold">{latestAnalysis.bmi || '—'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Состав тела</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Жировая масса</p>
                      <p className="text-lg font-semibold">{latestAnalysis.body_fat_mass || '—'} кг</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Белок</p>
                      <p className="text-lg font-semibold">{latestAnalysis.protein || '—'} кг</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Минералы</p>
                      <p className="text-lg font-semibold">{latestAnalysis.minerals || '—'} кг</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Вода</p>
                      <p className="text-lg font-semibold">{latestAnalysis.total_body_water || '—'} л</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">BMR</p>
                      <p className="text-lg font-semibold">{latestAnalysis.bmr || '—'} ккал</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Висц. жир</p>
                      <p className="text-lg font-semibold">{latestAnalysis.visceral_fat_area || '—'} см²</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Сегментарный анализ */}
              <Card>
                <CardHeader>
                  <CardTitle>Сегментарный анализ</CardTitle>
                  <CardDescription>Распределение мышечной массы по телу</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Правая рука</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{latestAnalysis.right_arm_mass || '—'} кг</Badge>
                        <Badge variant="secondary">{latestAnalysis.right_arm_percent || '—'}%</Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Левая рука</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{latestAnalysis.left_arm_mass || '—'} кг</Badge>
                        <Badge variant="secondary">{latestAnalysis.left_arm_percent || '—'}%</Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Туловище</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{latestAnalysis.trunk_mass || '—'} кг</Badge>
                        <Badge variant="secondary">{latestAnalysis.trunk_percent || '—'}%</Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Правая нога</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{latestAnalysis.right_leg_mass || '—'} кг</Badge>
                        <Badge variant="secondary">{latestAnalysis.right_leg_percent || '—'}%</Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Левая нога</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{latestAnalysis.left_leg_mass || '—'} кг</Badge>
                        <Badge variant="secondary">{latestAnalysis.left_leg_percent || '—'}%</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {latestAnalysis.pdf_url && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Исходный PDF
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" asChild>
                      <a href={latestAnalysis.pdf_url} target="_blank" rel="noopener noreferrer">
                        Открыть PDF файл
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Alert>
              <Upload className="h-4 w-4" />
              <AlertDescription>
                Загрузите первый файл InBody, чтобы увидеть анализ
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {inbodyAnalyses && inbodyAnalyses.length > 0 ? (
            <div className="space-y-3">
              {inbodyAnalyses.map((analysis, index) => (
                <Card key={analysis.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {format(new Date(analysis.test_date), 'd MMMM yyyy', { locale: ru })}
                      </CardTitle>
                      {index === 0 && <Badge>Последнее</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Вес</p>
                        <p className="font-semibold">{analysis.weight || '—'} кг</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">% жира</p>
                        <p className="font-semibold">{analysis.percent_body_fat || '—'}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Мышцы</p>
                        <p className="font-semibold">{analysis.skeletal_muscle_mass || '—'} кг</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">BMI</p>
                        <p className="font-semibold">{analysis.bmi || '—'}</p>
                      </div>
                    </div>
                    {analysis.pdf_url && (
                      <div className="mt-3">
                        <Button variant="ghost" size="sm" asChild>
                          <a href={analysis.pdf_url} target="_blank" rel="noopener noreferrer">
                            <FileText className="h-4 w-4 mr-2" />
                            PDF
                          </a>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Alert>
              <Upload className="h-4 w-4" />
              <AlertDescription>
                История измерений пуста. Загрузите файлы InBody.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
