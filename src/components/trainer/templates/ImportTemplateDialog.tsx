import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileJson } from "lucide-react";
import { toast } from "sonner";
import { type ChallengeTemplate, importTemplateFromJSON, saveImportedTemplate } from "@/features/challenges/utils";

interface ImportTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ImportTemplateDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportTemplateDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedTemplate, setParsedTemplate] = useState<Partial<ChallengeTemplate> | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Пожалуйста, выберите JSON файл');
      return;
    }

    setSelectedFile(file);

    // Parse file
    const result = await importTemplateFromJSON(file);
    if (result.success && result.template) {
      setParsedTemplate(result.template);
      setTemplateName(result.template.template_name || '');
      setDescription(result.template.description || '');
      toast.success('Шаблон загружен, проверьте данные');
    } else {
      toast.error(result.error || 'Ошибка чтения файла');
      setSelectedFile(null);
    }
  };

  const handleImport = async () => {
    if (!parsedTemplate) {
      toast.error('Нет данных для импорта');
      return;
    }

    if (!templateName.trim()) {
      toast.error('Введите название шаблона');
      return;
    }

    setIsImporting(true);
    try {
      const templateToSave: Partial<ChallengeTemplate> = {
        ...parsedTemplate,
        template_name: templateName,
        description: description || parsedTemplate.description,
        is_public: false, // Always import as private
      };

      const result = await saveImportedTemplate(templateToSave);

      if (result.success) {
        toast.success('Шаблон импортирован');
        onSuccess?.();
        onOpenChange(false);
        // Reset state
        setSelectedFile(null);
        setParsedTemplate(null);
        setTemplateName('');
        setDescription('');
      } else {
        toast.error(result.error || 'Ошибка импорта');
      }
    } catch (error) {
      console.error('Error importing template:', error);
      toast.error('Ошибка импорта шаблона');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="w-5 h-5" />
            Импорт шаблона
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6 pr-4">
            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file-upload">Загрузить JSON файл</Label>
              <div className="flex gap-2">
                <Input
                  id="file-upload"
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="cursor-pointer"
                />
                {selectedFile && (
                  <Badge variant="secondary" className="whitespace-nowrap">
                    {selectedFile.name}
                  </Badge>
                )}
              </div>
            </div>

            {parsedTemplate && (
              <>
                {/* Template Name */}
                <div className="space-y-2">
                  <Label htmlFor="template-name">
                    Название шаблона <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="template-name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Введите название..."
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Добавьте описание..."
                    rows={3}
                  />
                </div>

                {/* Preview */}
                <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Предпросмотр</Label>
                    {parsedTemplate.category && (
                      <Badge variant="outline">{parsedTemplate.category}</Badge>
                    )}
                  </div>

                  {parsedTemplate.duration_weeks && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Длительность:</span>{' '}
                      {parsedTemplate.duration_weeks} недель
                    </p>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Дисциплины ({parsedTemplate.template_data?.disciplines?.length || 0})
                    </p>
                    <div className="space-y-1">
                      {parsedTemplate.template_data?.disciplines?.map((disc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded bg-card text-sm"
                        >
                          <span>{disc.discipline_name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {disc.benchmark_value} {disc.unit}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="rounded-lg border p-4 bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    💡 Импортированный шаблон будет сохранен как приватный. 
                    Вы сможете опубликовать его позже в настройках.
                  </p>
                </div>
              </>
            )}

            {!selectedFile && (
              <div className="rounded-lg border-2 border-dashed p-8 text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Выберите JSON файл шаблона для импорта
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={handleImport}
            disabled={!parsedTemplate || isImporting}
          >
            <Upload className="w-4 h-4 mr-2" />
            {isImporting ? 'Импорт...' : 'Импортировать'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
