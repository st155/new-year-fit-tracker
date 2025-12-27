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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation('trainer');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedTemplate, setParsedTemplate] = useState<Partial<ChallengeTemplate> | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error(t('templates.importDialog.selectJsonFile'));
      return;
    }

    setSelectedFile(file);

    // Parse file
    const result = await importTemplateFromJSON(file);
    if (result.success && result.template) {
      setParsedTemplate(result.template);
      setTemplateName(result.template.template_name || '');
      setDescription(result.template.description || '');
      toast.success(t('templates.importDialog.loaded'));
    } else {
      toast.error(result.error || t('templates.importDialog.readError'));
      setSelectedFile(null);
    }
  };

  const handleImport = async () => {
    if (!parsedTemplate) {
      toast.error(t('templates.importDialog.noData'));
      return;
    }

    if (!templateName.trim()) {
      toast.error(t('templates.saveAs.enterName'));
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
        toast.success(t('templates.importDialog.imported'));
        onSuccess?.();
        onOpenChange(false);
        // Reset state
        setSelectedFile(null);
        setParsedTemplate(null);
        setTemplateName('');
        setDescription('');
      } else {
        toast.error(result.error || t('templates.importDialog.importError'));
      }
    } catch (error) {
      console.error('Error importing template:', error);
      toast.error(t('templates.importDialog.importError'));
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
            {t('templates.importDialog.title')}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6 pr-4">
            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file-upload">{t('templates.importDialog.uploadFile')}</Label>
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
                    {t('templates.importDialog.templateName')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="template-name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder={t('templates.importDialog.namePlaceholder')}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">{t('templates.importDialog.description')}</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('templates.importDialog.descriptionPlaceholder')}
                    rows={3}
                  />
                </div>

                {/* Preview */}
                <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>{t('templates.importDialog.preview')}</Label>
                    {parsedTemplate.category && (
                      <Badge variant="outline">{parsedTemplate.category}</Badge>
                    )}
                  </div>

                  {parsedTemplate.duration_weeks && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">{t('templates.importDialog.duration')}</span>{' '}
                      {parsedTemplate.duration_weeks} {t('templates.weeks')}
                    </p>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {t('templates.importDialog.disciplines')} ({parsedTemplate.template_data?.disciplines?.length || 0})
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
                    💡 {t('templates.importDialog.privateNote')}
                  </p>
                </div>
              </>
            )}

            {!selectedFile && (
              <div className="rounded-lg border-2 border-dashed p-8 text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t('templates.importDialog.selectFile')}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('templates.importDialog.cancel')}
          </Button>
          <Button
            onClick={handleImport}
            disabled={!parsedTemplate || isImporting}
          >
            <Upload className="w-4 h-4 mr-2" />
            {isImporting ? t('templates.importDialog.importing') : t('templates.importDialog.import')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
