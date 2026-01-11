import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCategoryDetail } from '@/hooks/medical-documents/useCategoryDetail';
import { CategoryMetricCard } from '@/components/medical-documents/CategoryMetricCard';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getIntlLocale } from '@/lib/date-locale';

const categoryIcons: Record<string, string> = {
  blood_test: '🩸',
  lab_urine: '🧪',
  imaging_report: '🔬',
  clinical_note: '📋',
  prescription: '💊',
  fitness_report: '🏃',
  inbody: '⚖️',
  progress_photo: '📸',
  other: '📁',
};

export default function CategoryDetailPage() {
  const { t } = useTranslation('categoryDetail');
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
          <p className="text-muted-foreground">{t('noData')}</p>
          <Button onClick={() => navigate('/medical-documents')} variant="outline" className="mt-4">
            {t('backToDocs')}
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
            <h1 className="text-3xl font-bold">{t(`categories.${categoryId}`)}</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            {t('documentCount', { count: data.documentCount })}
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
                {t('aiSummary')}
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
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{t('metrics')}</h2>
            <Badge variant="secondary">
              {t('metricCount', { count: data.metrics.length })}
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

      {/* Documents List */}
      {data.documents && data.documents.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{t('documents')}</h2>
            <Badge variant="secondary">{data.documents.length}</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.documents.map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
              >
                <Card 
                  className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg"
                  onClick={() => navigate(`/medical-documents/${doc.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base truncate flex-1">
                        {doc.file_name}
                      </CardTitle>
                      <Badge 
                        variant="outline"
                        className={
                          doc.processing_status === 'completed' 
                            ? 'bg-green-500/20 text-green-500 border-green-500/50'
                            : doc.processing_status === 'processing'
                            ? 'bg-blue-500/20 text-blue-500 border-blue-500/50'
                            : doc.processing_status === 'error'
                            ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50'
                            : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50'
                        }
                      >
                        {t(`processingStatus.${doc.processing_status || 'pending'}`)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {doc.document_date ? new Date(doc.document_date).toLocaleDateString(getIntlLocale(), {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      }) : t('dateNotSpecified')}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {doc.ai_summary || t('noDescription')}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!data.metrics || data.metrics.length === 0) && (!data.documents || data.documents.length === 0) && (
        <Card className="py-12">
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              {t('emptyCategory')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
