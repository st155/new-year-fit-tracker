import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Target, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface GoalTemplate {
  id: string;
  trainer_id: string;
  template_name: string;
  goal_type: string;
  target_value: number;
  unit: string;
  description: string;
  is_public: boolean;
  usage_count: number;
}

export function GoalTemplatesLibrary() {
  const { t } = useTranslation('trainer');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    template_name: '',
    goal_type: 'weight',
    target_value: 0,
    unit: 'kg',
    description: '',
    is_public: false,
  });

  // Fetch templates (using any until migration is run)
  const { data: templates = [] } = useQuery({
    queryKey: ['goal-templates', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('goal_templates')
        .select('*')
        .or(`trainer_id.eq.${user?.id},is_public.eq.true`)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return data as GoalTemplate[];
    },
    enabled: !!user?.id,
  });

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (template: typeof newTemplate) => {
      const { data, error } = await (supabase as any)
        .from('goal_templates')
        .insert({
          ...template,
          trainer_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-templates'] });
      toast.success(t('goalTemplates.created'));
      setIsCreateOpen(false);
      setNewTemplate({
        template_name: '',
        goal_type: 'weight',
        target_value: 0,
        unit: 'kg',
        description: '',
        is_public: false,
      });
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await (supabase as any)
        .from('goal_templates')
        .delete()
        .eq('id', templateId)
        .eq('trainer_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-templates'] });
      toast.success(t('goalTemplates.deleted'));
    },
  });

  // Use template (copy to client)
  const useTemplate = async (template: GoalTemplate, clientId: string) => {
    // This would be called from ClientDetailView with clientId
    toast.info(t('goalTemplates.assigning'));
  };

  const myTemplates = templates.filter(t => t.trainer_id === user?.id);
  const publicTemplates = templates.filter(t => t.is_public && t.trainer_id !== user?.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('goalTemplates.title')}</h2>
          <p className="text-muted-foreground">
            {t('goalTemplates.description')}
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t('goalTemplates.newTemplate')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('goalTemplates.createTemplate')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('goalTemplates.templateName')}</Label>
                <Input
                  value={newTemplate.template_name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, template_name: e.target.value })}
                  placeholder={t('goalTemplates.namePlaceholder')}
                />
              </div>
              <div>
                <Label>{t('goalTemplates.goalType')}</Label>
                <Select
                  value={newTemplate.goal_type}
                  onValueChange={(value) => setNewTemplate({ ...newTemplate, goal_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weight">{t('goalTemplates.types.weight')}</SelectItem>
                    <SelectItem value="body_fat">{t('goalTemplates.types.bodyFat')}</SelectItem>
                    <SelectItem value="muscle_mass">{t('goalTemplates.types.muscleMass')}</SelectItem>
                    <SelectItem value="vo2max">{t('goalTemplates.types.vo2max')}</SelectItem>
                    <SelectItem value="steps">{t('goalTemplates.types.steps')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('goalTemplates.targetValue')}</Label>
                  <Input
                    type="number"
                    value={newTemplate.target_value}
                    onChange={(e) => setNewTemplate({ ...newTemplate, target_value: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>{t('goalTemplates.unit')}</Label>
                  <Input
                    value={newTemplate.unit}
                    onChange={(e) => setNewTemplate({ ...newTemplate, unit: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>{t('goalTemplates.descriptionLabel')}</Label>
                <Textarea
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder={t('goalTemplates.descriptionPlaceholder')}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => createMutation.mutate(newTemplate)}
                disabled={!newTemplate.template_name || !newTemplate.target_value}
              >
                {t('goalTemplates.create')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* My Templates */}
      <div>
        <h3 className="text-lg font-semibold mb-4">{t('goalTemplates.myTemplates')} ({myTemplates.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myTemplates.map(template => (
            <Card key={template.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    <CardTitle className="text-base">{template.template_name}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(template.id)}
                    className="h-7 w-7"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('goalTemplates.target')}</span>
                  <span className="font-medium">
                    {template.target_value} {template.unit}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('goalTemplates.type')}</span>
                  <Badge variant="secondary">{template.goal_type}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('goalTemplates.used')}</span>
                  <span>{template.usage_count} {t('goalTemplates.times')}</span>
                </div>
                {template.description && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {template.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Public Templates */}
      {publicTemplates.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">
            {t('goalTemplates.communityTemplates')} ({publicTemplates.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicTemplates.map(template => (
              <Card key={template.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    <CardTitle className="text-base">{template.template_name}</CardTitle>
                    <Badge variant="outline" className="ml-auto">{t('goalTemplates.public')}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('goalTemplates.target')}</span>
                    <span className="font-medium">
                      {template.target_value} {template.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('goalTemplates.used')}</span>
                    <span>{template.usage_count} {t('goalTemplates.times')}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
