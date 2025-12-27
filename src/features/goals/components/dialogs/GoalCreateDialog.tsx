import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Check, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FormValidation, validationRules, useFormValidation } from "@/components/ui/form-validation";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useGoalMutations } from "../../hooks";
import { useTranslation } from "react-i18next";

interface GoalTemplate {
  name: string;
  type: string;
  value: number;
  unit: string;
}

const goalTemplateKeys = [
  { key: 'rowing2km', type: "endurance", value: 8.5, unit: "мин" },
  { key: 'run1km', type: "endurance", value: 4.0, unit: "мин" },
  { key: 'pullups', type: "strength", value: 17, unit: "раз" },
  { key: 'benchPress', type: "strength", value: 90, unit: "кг" },
  { key: 'lunges', type: "strength", value: 50, unit: "кг ×8" },
  { key: 'plank', type: "endurance", value: 4, unit: "мин" },
  { key: 'pushups', type: "strength", value: 60, unit: "раз" },
  { key: 'legRaises', type: "strength", value: 17, unit: "раз" },
  { key: 'vo2max', type: "cardio", value: 52, unit: "мл/кг/мин" },
  { key: 'bodyFat', type: "body_composition", value: 11, unit: "%" }
];

const goalTypeKeys = ['strength', 'cardio', 'endurance', 'body_composition', 'flexibility'] as const;

interface GoalCreateDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onGoalCreated?: () => void;
}

export function GoalCreateDialog({ 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange,
  onGoalCreated 
}: GoalCreateDialogProps) {
  const { t } = useTranslation('goals');
  const [internalOpen, setInternalOpen] = useState(false);
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [goalScope, setGoalScope] = useState<'personal' | 'challenge'>('personal');
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>("");
  const [challenges, setChallenges] = useState<Array<{ id: string; title: string }>>([]);
  const { user } = useAuth();

  const { createGoal } = useGoalMutations();

  // Get translated templates
  const goalTemplates = goalTemplateKeys.map(tmpl => ({
    name: t(`templates.${tmpl.key}`),
    key: tmpl.key,
    type: tmpl.type,
    value: tmpl.value,
    unit: tmpl.unit
  }));
  // Fetch user's active challenges
  useEffect(() => {
    const fetchChallenges = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('challenge_participants')
        .select('challenge_id, challenges(id, title)')
        .eq('user_id', user.id);
      
      if (data) {
        setChallenges(data.map(p => ({
          id: p.challenge_id,
          title: (p.challenges as any)?.title || ''
        })));
      }
    };
    
    if (open) {
      fetchChallenges();
    }
  }, [open, user]);

  const {
    values: customGoal,
    errors,
    touched,
    setValue,
    setFieldTouched,
    validateAll,
    reset,
    isFormValid
  } = useFormValidation(
    { name: "", type: "", value: 0, unit: "" },
    {
      name: [validationRules.required(), validationRules.minLength(2)],
      type: [validationRules.required(t('createDialog.validation.selectType'))],
      value: [validationRules.required(t('createDialog.validation.enterTarget')), validationRules.positiveNumber()],
      unit: [validationRules.required(t('createDialog.validation.enterUnit'))]
    }
  );

  const handleTemplateSelect = (templateKey: string) => {
    const template = goalTemplates.find(tmpl => tmpl.key === templateKey);
    if (template) {
      setValue('name', template.name);
      setValue('type', template.type);
      setValue('value', template.value);
      setValue('unit', template.unit);
      
      setFieldTouched('name');
      setFieldTouched('type');
      setFieldTouched('value');
      setFieldTouched('unit');
      
      setSelectedTemplate(templateKey);
    }
  };

  const handleCreate = async () => {
    if (!user || !validateAll()) return;

    createGoal.mutate({
      user_id: user.id,
      goal_name: customGoal.name,
      goal_type: customGoal.type,
      target_value: customGoal.value,
      target_unit: customGoal.unit,
      is_personal: goalScope === 'personal',
      challenge_id: goalScope === 'challenge' ? selectedChallengeId : undefined
    }, {
      onSuccess: () => {
        setOpen(false);
        setSelectedTemplate("");
        setGoalScope('personal');
        setSelectedChallengeId("");
        reset();
        if (onGoalCreated) {
          onGoalCreated();
        }
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="fitness" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          {t('createDialog.add')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('createDialog.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t('createDialog.scopeLabel')}</Label>
            <RadioGroup value={goalScope} onValueChange={(v) => setGoalScope(v as 'personal' | 'challenge')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="personal" id="personal" />
                <Label htmlFor="personal" className="font-normal">{t('createDialog.personal')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="challenge" id="challenge" />
                <Label htmlFor="challenge" className="font-normal">{t('createDialog.challenge')}</Label>
              </div>
            </RadioGroup>
          </div>

          {goalScope === 'challenge' && (
            <div>
              <Label>{t('createDialog.selectChallenge')}</Label>
              <Select value={selectedChallengeId} onValueChange={setSelectedChallengeId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('createDialog.selectChallenge')} />
                </SelectTrigger>
                <SelectContent>
                  {challenges.map((challenge) => (
                    <SelectItem key={challenge.id} value={challenge.id}>
                      {challenge.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-muted-foreground text-sm">
              {t('createDialog.templateLabel')}
            </Label>
            <div className="flex gap-2">
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={t('createDialog.templatePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {goalTemplates.map((template) => (
                    <SelectItem key={template.key} value={template.key}>
                      {template.name} - {template.value} {template.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  type="button"
                  onClick={() => {
                    setSelectedTemplate("");
                    reset();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <Separator className="my-4" />
          <p className="text-sm text-muted-foreground -mt-2 mb-2">
            {t('createDialog.orManual')}
          </p>

          <div>
            <Label htmlFor="goal_name">{t('createDialog.nameLabel')}</Label>
            <Input
              id="goal_name"
              value={customGoal.name}
              onChange={(e) => setValue('name', e.target.value)}
              onBlur={() => setFieldTouched('name')}
              placeholder={t('createDialog.namePlaceholder')}
              className={errors.name?.length > 0 ? 'border-destructive' : ''}
            />
            <FormValidation
              value={customGoal.name}
              rules={[validationRules.required(), validationRules.minLength(2)]}
              showValidation={touched.name}
            />
          </div>

          <div>
            <Label htmlFor="goal_type">{t('createDialog.typeLabel')}</Label>
            <Select
              value={customGoal.type}
              onValueChange={(value) => {
                setValue('type', value);
                setFieldTouched('type');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('createDialog.typePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {goalTypeKeys.map((typeKey) => (
                  <SelectItem key={typeKey} value={typeKey}>{t(`types.${typeKey}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormValidation
              value={customGoal.type}
              rules={[validationRules.required(t('createDialog.validation.selectType'))]}
              showValidation={touched.type}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="target_value">{t('createDialog.targetLabel')}</Label>
              <Input
                id="target_value"
                type="number"
                step="0.1"
                value={customGoal.value || ""}
                onChange={(e) => setValue('value', parseFloat(e.target.value) || 0)}
                onBlur={() => setFieldTouched('value')}
                className={errors.value?.length > 0 ? 'border-destructive' : ''}
              />
              <FormValidation
                value={customGoal.value}
                rules={[validationRules.required(t('createDialog.validation.enterTarget')), validationRules.positiveNumber()]}
                showValidation={touched.value}
              />
            </div>
            <div>
              <Label htmlFor="target_unit">{t('createDialog.unitLabel')}</Label>
              <Input
                id="target_unit"
                value={customGoal.unit}
                onChange={(e) => setValue('unit', e.target.value)}
                onBlur={() => setFieldTouched('unit')}
                placeholder={t('createDialog.unitPlaceholder')}
                className={errors.unit?.length > 0 ? 'border-destructive' : ''}
              />
              <FormValidation
                value={customGoal.unit}
                rules={[validationRules.required(t('createDialog.validation.enterUnit'))]}
                showValidation={touched.unit}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleCreate} disabled={createGoal.isPending || !isFormValid} className="flex-1">
              {createGoal.isPending ? (
                t('createDialog.creating')
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {t('createDialog.create')}
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
              {t('createDialog.cancel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
