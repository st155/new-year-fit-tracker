import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCategoryDetail } from '@/hooks/medical-documents/useCategoryDetail';
import { CategoryMetricCard } from '@/components/medical-documents/CategoryMetricCard';
import { motion } from 'framer-motion';

const categoryLabels: Record<string, string> = {
  lab_blood: 'Анализы крови',
  lab_urine: 'Анализы мочи',
  imaging_report: 'МРТ/УЗИ',
  clinical_note: 'Заключения',
  other: 'Другие',
};

const categoryIcons: Record<string, string> = {
  lab_blood: '🩸',
  lab_urine: '🧪',
  imaging_report: '🔬',
  clinical_note: '📋',
  other: '📁',
};

export default function CategoryDetailPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useCategoryDetail(categoryId!);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="text-center">
          <p className="text-muted-foreground">Нет данных для отображения</p>
          <Button onClick={() => navigate('/medical-documents')} variant="outline" className="mt-4">
            Вернуться к документам
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/medical-documents')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{categoryIcons[categoryId!]}</span>
            <h1 className="text-3xl font-bold">{categoryLabels[categoryId!]}</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            {data.documentCount} документ{data.documentCount === 1 ? '' : data.documentCount < 5 ? 'а' : 'ов'}
            {data.dateRange && ` · ${data.dateRange.from} - ${data.dateRange.to}`}
          </p>
        </div>
      </div>

      {/* AI Summary Card */}
      {data.aiSummary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="mb-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🤖</span>
                AI Саммари
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                {data.aiSummary}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Metrics Grid */}
      {data.metrics && data.metrics.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Показатели</h2>
            <Badge variant="secondary">
              {data.metrics.length} показател{data.metrics.length === 1 ? 'ь' : data.metrics.length < 5 ? 'я' : 'ей'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.metrics.map((metric, index) => (
              <motion.div
                key={metric.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <CategoryMetricCard metric={metric} category={categoryId!} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!data.metrics || data.metrics.length === 0) && (
        <Card className="py-12">
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              Нет данных для отображения в этой категории
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
