import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategorySummaries } from "@/hooks/medical-documents/useCategorySummaries";
import { useNavigate } from "react-router-dom";
import { Droplet, FileText, Microscope, Stethoscope, Folder, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const categoryIcons: Record<string, any> = {
  lab_blood: Droplet,
  lab_urine: Microscope,
  imaging_report: Stethoscope,
  clinical_note: FileText,
  other: Folder,
};

const categoryLabels: Record<string, string> = {
  lab_blood: 'Анализы крови',
  lab_urine: 'Анализы мочи',
  imaging_report: 'МРТ/УЗИ',
  clinical_note: 'Заключения',
  other: 'Другие',
};

const categoryColors: Record<string, string> = {
  lab_blood: 'from-red-500/20 to-pink-500/20 border-red-500/30',
  lab_urine: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30',
  imaging_report: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
  clinical_note: 'from-purple-500/20 to-violet-500/20 border-purple-500/30',
  other: 'from-gray-500/20 to-slate-500/20 border-gray-500/30',
};

export const CategorySummaryDashboard = () => {
  const { data: summaries, isLoading } = useCategorySummaries();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Сводка по категориям</h2>
        <p className="text-muted-foreground">
          Быстрый обзор ваших медицинских документов
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {summaries?.map((summary) => {
          const Icon = categoryIcons[summary.category];
          return (
            <motion.div
              key={summary.category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Card className={`bg-gradient-to-br ${categoryColors[summary.category]} hover:shadow-lg transition-shadow`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      <CardTitle className="text-lg">
                        {categoryLabels[summary.category]}
                      </CardTitle>
                    </div>
                    <Badge variant="secondary" className="ml-auto">
                      {summary.count}
                    </Badge>
                  </div>
                  <CardDescription>
                    Последний: {new Date(summary.lastDate).toLocaleDateString('ru-RU')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm line-clamp-3 text-muted-foreground">
                    {summary.aiSummary}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full gap-2 group"
                    onClick={() => navigate('/medical-documents', { state: { filterCategory: summary.category } })}
                  >
                    Подробнее
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
