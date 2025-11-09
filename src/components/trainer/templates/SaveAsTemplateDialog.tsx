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
import { createTemplateFromChallenge } from "@/lib/challenge-templates";

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
  const [templateName, setTemplateName] = useState(challengeTitle);
  const [description, setDescription] = useState('');
  const [makePublic, setMakePublic] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error('Введите название шаблона');
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
        toast.success('Шаблон сохранен');
        onSuccess?.();
        onOpenChange(false);
        // Reset form
        setTemplateName(challengeTitle);
        setDescription('');
        setMakePublic(false);
      } else {
        toast.error(result.error || 'Ошибка создания шаблона');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Ошибка сохранения шаблона');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Сохранить как шаблон</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6 pr-4">
            {/* Template Name */}
            <div className="space-y-2">
              <Label htmlFor="template-name">
                Название шаблона <span className="text-destructive">*</span>
              </Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Например: 8-Week Strength Builder"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Опишите этот шаблон и для кого он подходит..."
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
                Сделать шаблон публичным (доступен всем тренерам)
              </Label>
            </div>

            {/* Info */}
            <div className="rounded-lg border p-4 bg-muted/50">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Совет:</strong> Шаблон сохранит структуру челленджа, включая все 
                дисциплины и их параметры. При создании нового челленджа из шаблона вы сможете 
                настроить длительность и уровень сложности.
              </p>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Оригинальный челлендж</Label>
              <div className="rounded-lg border p-3 bg-card">
                <p className="font-medium">{challengeTitle}</p>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={isCreating}>
            <Save className="w-4 h-4 mr-2" />
            {isCreating ? 'Сохранение...' : 'Сохранить шаблон'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
