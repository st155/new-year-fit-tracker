import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { createTemplateFromChallenge } from "@/features/challenges/utils";
import { useTranslation } from "react-i18next";

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeId: string;
  challengeTitle: string;
  onSuccess?: () => void;
}

export function SaveAsTemplateDialog({
  open,
  onOpenChange,
  challengeId,
  challengeTitle,
  onSuccess,
}: SaveAsTemplateDialogProps) {
  const { t } = useTranslation('trainer');
  const [templateName, setTemplateName] = useState(challengeTitle);
  const [description, setDescription] = useState('');
  const [makePublic, setMakePublic] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error(t('templates.saveAs.enterName'));
      return;
    }

    setIsCreating(true);
    try {
      const result = await createTemplateFromChallenge(
        challengeId,
        templateName,
        description,
        makePublic
      );

      if (result.success) {
        toast.success(t('templates.saveAs.saved'));
        onSuccess?.();
        onOpenChange(false);
        // Reset form
        setTemplateName(challengeTitle);
        setDescription('');
        setMakePublic(false);
      } else {
        toast.error(result.error || t('templates.saveAs.saveError'));
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(t('templates.saveAs.saveError'));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('templates.saveAs.title')}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6 pr-4">
            {/* Template Name */}
            <div className="space-y-2">
              <Label htmlFor="template-name">
                {t('templates.saveAs.templateName')} <span className="text-destructive">{t('templates.saveAs.required')}</span>
              </Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder={t('templates.saveAs.namePlaceholder')}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{t('templates.saveAs.description')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('templates.saveAs.descriptionPlaceholder')}
                rows={4}
              />
            </div>

            {/* Make Public */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="make-public"
                checked={makePublic}
                onCheckedChange={(checked) => setMakePublic(checked as boolean)}
              />
              <Label
                htmlFor="make-public"
                className="text-sm font-normal cursor-pointer"
              >
                {t('templates.saveAs.makePublic')}
              </Label>
            </div>

            {/* Info */}
            <div className="rounded-lg border p-4 bg-muted/50">
              <p className="text-sm text-muted-foreground">
                💡 <strong>{t('templates.saveAs.tip')}</strong>
              </p>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>{t('templates.saveAs.originalChallenge')}</Label>
              <div className="rounded-lg border p-3 bg-card">
                <p className="font-medium">{challengeTitle}</p>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('templates.saveAs.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isCreating}>
            <Save className="w-4 h-4 mr-2" />
            {isCreating ? t('templates.saveAs.saving') : t('templates.saveAs.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
