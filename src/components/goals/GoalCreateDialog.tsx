import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Check, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { FormValidation, validationRules, useFormValidation } from "@/components/ui/form-validation";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface GoalTemplate {
  name: string;
  type: string;
  value: number;
  unit: string;
}

const goalTemplates: GoalTemplate[] = [
  { name: "Гребля 2 км", type: "endurance", value: 8.5, unit: "мин" },
  { name: "Бег 1 км", type: "endurance", value: 4.0, unit: "мин" },
  { name: "Подтягивания", type: "strength", value: 17, unit: "раз" },
  { name: "Жим лёжа", type: "strength", value: 90, unit: "кг" },
  { name: "Выпады назад со штангой", type: "strength", value: 50, unit: "кг ×8" },
  { name: "Планка", type: "endurance", value: 4, unit: "мин" },
  { name: "Отжимания", type: "strength", value: 60, unit: "раз" },
  { name: "Подъём ног в висе до перекладины", type: "strength", value: 17, unit: "раз" },
  { name: "VO2max", type: "cardio", value: 52, unit: "мл/кг/мин" },
  { name: "Процент жира", type: "body_composition", value: 11, unit: "%" }
];

const goalTypeLabels: Record<string, string> = {
  strength: 'Сила',
  cardio: 'Кардио',
  endurance: 'Выносливость',
  body_composition: 'Состав тела',
  flexibility: 'Гибкость'
};

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
  const [internalOpen, setInternalOpen] = useState(false);
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [goalScope, setGoalScope] = useState<'personal' | 'challenge'>('personal');
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>("");
  const [challenges, setChallenges] = useState<Array<{ id: string; title: string }>>([]);
  const { user } = useAuth();
  const { toast } = useToast();

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
          title: p.challenges?.title || ''
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
      type: [validationRules.required("Выберите тип цели")],
      value: [validationRules.required("Укажите целевое значение"), validationRules.positiveNumber()],
      unit: [validationRules.required("Укажите единицу измерения")]
    }
  );

  const handleTemplateSelect = (templateName: string) => {
    const template = goalTemplates.find(t => t.name === templateName);
    if (template) {
      setValue('name', template.name);
      setValue('type', template.type);
      setValue('value', template.value);
      setValue('unit', template.unit);
      
      // Принудительно пометить поля как "тронутые" для визуальной обратной связи
      setFieldTouched('name');
      setFieldTouched('type');
      setFieldTouched('value');
      setFieldTouched('unit');
      
      setSelectedTemplate(templateName);
    }
  };

  const handleCreate = async () => {
    if (!user || !validateAll()) return;

    setLoading(true);
    try {
      // Check if goal already exists
      const { data: existingGoal } = await supabase
        .from('goals')
        .select('id')
        .eq('user_id', user.id)
        .eq('goal_name', customGoal.name)
        .eq('goal_type', customGoal.type)
        .eq('is_personal', true)
        .maybeSingle();

      if (existingGoal) {
        toast({
          title: "Внимание",
          description: "Такая цель уже существует",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          goal_name: customGoal.name,
          goal_type: customGoal.type,
          target_value: customGoal.value,
          target_unit: customGoal.unit,
          is_personal: goalScope === 'personal',
          challenge_id: goalScope === 'challenge' ? selectedChallengeId : null
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('Такая цель уже существует');
        }
        throw error;
      }

      toast({
        title: "Успех",
        description: "Цель создана"
      });
      setOpen(false);
      setSelectedTemplate("");
      setGoalScope('personal');
      setSelectedChallengeId("");
      reset();
      if (onGoalCreated) {
        onGoalCreated();
      }
    } catch (error: any) {
      console.error('Error creating goal:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать цель",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="fitness" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Добавить
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Создать цель</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Тип цели</Label>
            <RadioGroup value={goalScope} onValueChange={(v) => setGoalScope(v as 'personal' | 'challenge')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="personal" id="personal" />
                <Label htmlFor="personal" className="font-normal">Личная цель</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="challenge" id="challenge" />
                <Label htmlFor="challenge" className="font-normal">Цель челленджа</Label>
              </div>
            </RadioGroup>
          </div>

          {goalScope === 'challenge' && (
            <div>
              <Label>Выберите челлендж</Label>
              <Select value={selectedChallengeId} onValueChange={setSelectedChallengeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите челлендж" />
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
              Быстрый выбор шаблона (необязательно)
            </Label>
            <div className="flex gap-2">
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Выберите готовую цель" />
                </SelectTrigger>
                <SelectContent>
                  {goalTemplates.map((template) => (
                    <SelectItem key={template.name} value={template.name}>
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
            или заполните вручную:
          </p>

          <div>
            <Label htmlFor="goal_name">Название цели</Label>
            <Input
              id="goal_name"
              value={customGoal.name}
              onChange={(e) => setValue('name', e.target.value)}
              onBlur={() => setFieldTouched('name')}
              placeholder="Введите название цели"
              className={errors.name?.length > 0 ? 'border-destructive' : ''}
            />
            <FormValidation
              value={customGoal.name}
              rules={[validationRules.required(), validationRules.minLength(2)]}
              showValidation={touched.name}
            />
          </div>

          <div>
            <Label htmlFor="goal_type">Тип цели</Label>
            <Select
              value={customGoal.type}
              onValueChange={(value) => {
                setValue('type', value);
                setFieldTouched('type');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите тип" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(goalTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormValidation
              value={customGoal.type}
              rules={[validationRules.required("Выберите тип цели")]}
              showValidation={touched.type}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="target_value">Целевое значение</Label>
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
                rules={[validationRules.required("Укажите целевое значение"), validationRules.positiveNumber()]}
                showValidation={touched.value}
              />
            </div>
            <div>
              <Label htmlFor="target_unit">Единица</Label>
              <Input
                id="target_unit"
                value={customGoal.unit}
                onChange={(e) => setValue('unit', e.target.value)}
                onBlur={() => setFieldTouched('unit')}
                placeholder="кг, раз, мин"
                className={errors.unit?.length > 0 ? 'border-destructive' : ''}
              />
              <FormValidation
                value={customGoal.unit}
                rules={[validationRules.required("Укажите единицу измерения")]}
                showValidation={touched.unit}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleCreate} disabled={loading || !isFormValid} className="flex-1">
              {loading ? (
                'Создание...'
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Создать
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Отмена
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}