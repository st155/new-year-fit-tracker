import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertCircle, ChevronRight, RefreshCw } from 'lucide-react';

interface ErrorDetailsPanelProps {
  documentId: string;
  processingError: string;
  processingErrorDetails: any;
  onRetry: () => void;
  isRetrying?: boolean;
}

const errorTypeLabels: Record<string, { label: string; icon: string; color: string }> = {
  pdf_download: { label: 'Ошибка загрузки PDF', icon: '⬇️', color: 'orange' },
  pdf_parse: { label: 'Ошибка парсинга PDF', icon: '📄', color: 'red' },
  gemini_api: { label: 'Ошибка Gemini API', icon: '🤖', color: 'purple' },
  json_parse: { label: 'Ошибка парсинга JSON', icon: '📋', color: 'yellow' },
  database_save: { label: 'Ошибка сохранения в БД', icon: '💾', color: 'blue' },
  unknown: { label: 'Неизвестная ошибка', icon: '❓', color: 'gray' },
};

const errorSuggestions: Record<string, string[]> = {
  pdf_download: [
    'Проверьте, что файл не был удалён из хранилища',
    'Убедитесь, что у вас есть доступ к документу',
  ],
  pdf_parse: [
    'Файл может быть повреждён - попробуйте перезагрузить',
    'Убедитесь, что это действительно PDF файл',
  ],
  gemini_api: [
    'Возможно, превышен лимит API - попробуйте позже',
    'Документ может быть слишком большим для обработки',
  ],
  json_parse: [
    'AI вернул некорректный ответ - попробуйте ещё раз',
    'Возможно, документ слишком сложный для анализа',
  ],
  database_save: [
    'Проблема с подключением к базе данных',
    'Попробуйте повторить обработку через несколько минут',
  ],
  unknown: [
    'Попробуйте повторить обработку',
    'Если проблема повторяется, свяжитесь с поддержкой',
  ],
};

export const ErrorDetailsPanel = ({
  documentId,
  processingError,
  processingErrorDetails,
  onRetry,
  isRetrying = false,
}: ErrorDetailsPanelProps) => {
  const errorType = processingErrorDetails?.error_type || 'unknown';
  const errorInfo = errorTypeLabels[errorType] || errorTypeLabels.unknown;
  const suggestions = errorSuggestions[errorType] || errorSuggestions.unknown;

  return (
    <Card className="border-red-500/50 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-400">
          <AlertCircle className="h-5 w-5" />
          Ошибка обработки документа
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error Type Badge */}
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={`bg-${errorInfo.color}-500/20 text-${errorInfo.color}-400 border-${errorInfo.color}-500/30`}
          >
            {errorInfo.icon} {errorInfo.label}
          </Badge>
          {processingErrorDetails?.timestamp && (
            <span className="text-xs text-muted-foreground">
              {new Date(processingErrorDetails.timestamp).toLocaleString('ru-RU')}
            </span>
          )}
        </div>

        {/* Error Message */}
        <div className="p-3 bg-neutral-900 rounded-lg border border-red-500/30">
          <p className="text-sm font-mono text-red-400">
            {processingError}
          </p>
        </div>

        {/* PDF Info (if available) */}
        {processingErrorDetails?.pdf_info && (
          <div className="p-3 bg-neutral-900 rounded-lg border border-border/50">
            <h4 className="text-sm font-semibold text-foreground mb-2">📄 Информация о файле:</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Размер: {(processingErrorDetails.pdf_info.file_size / 1024 / 1024).toFixed(2)} MB</div>
              <div>Тип: {processingErrorDetails.pdf_info.mime_type}</div>
              <div>
                PDF заголовок: {processingErrorDetails.pdf_info.has_valid_header ? '✅ Валидный' : '❌ Невалидный'}
              </div>
            </div>
          </div>
        )}

        {/* Gemini Response Info (if available) */}
        {processingErrorDetails?.gemini_response && (
          <div className="p-3 bg-neutral-900 rounded-lg border border-border/50">
            <h4 className="text-sm font-semibold text-foreground mb-2">🤖 Ответ Gemini:</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              {processingErrorDetails.gemini_response.status_code && (
                <div>Статус: {processingErrorDetails.gemini_response.status_code}</div>
              )}
              {processingErrorDetails.gemini_response.finish_reason && (
                <div>Причина завершения: {processingErrorDetails.gemini_response.finish_reason}</div>
              )}
              {processingErrorDetails.gemini_response.response_length && (
                <div>Длина ответа: {processingErrorDetails.gemini_response.response_length} символов</div>
              )}
            </div>
          </div>
        )}

        {/* Detailed Info (Collapsible) */}
        {processingErrorDetails && (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className="h-4 w-4" />
              Технические детали
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 p-3 bg-neutral-900 rounded-lg border border-border/50">
              <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(processingErrorDetails, null, 2)}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Suggestions */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-400 mb-2">💡 Рекомендации:</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            {suggestions.map((suggestion, idx) => (
              <li key={idx}>{suggestion}</li>
            ))}
          </ul>
        </div>

        {/* Retry Button */}
        <div className="flex gap-2">
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            className="flex-1 bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 shadow-[0_0_8px_rgba(34,197,94,0.3)]"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Обработка...
              </>
            ) : (
              <>
                🔄 Попробовать снова
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => window.open('https://docs.lovable.dev/troubleshooting', '_blank')}
            className="border-border/50 hover:bg-accent"
          >
            📚 Помощь
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};