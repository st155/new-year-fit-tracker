import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { aiTrainingApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface AITrainingOnboardingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Message {
  id: string;
  role: 'ai' | 'user';
  content: string;
  type?: 'text' | 'buttons' | 'slider' | 'number' | 'multiselect' | 'textinput' | 'lifting-styles';
  options?: any;
  awaitingInput?: boolean;
}

interface ConversationData {
  primary_goal?: string;
  experience_level?: string;
  training_days?: number[];
  equipment?: string;
  job_stress?: number;
  average_sleep_hours?: number;
  focus_areas_selected?: string[];
  lifting_styles?: {
    squat?: string;
    deadlift?: string;
    bench?: string;
  };
  current_1rm?: {
    squat?: number;
    bench?: number;
    deadlift?: number;
  };
  injuries_limitations?: string;
}

export default function AITrainingOnboarding({ open, onOpenChange, onSuccess }: AITrainingOnboardingProps) {
  const { t } = useTranslation('workouts');
  const { toast } = useToast();
  
  const dayMapping: Record<string, number> = {
    [t('aiOnboarding.days.mon')]: 1, 
    [t('aiOnboarding.days.tue')]: 2, 
    [t('aiOnboarding.days.wed')]: 3, 
    [t('aiOnboarding.days.thu')]: 4, 
    [t('aiOnboarding.days.fri')]: 5, 
    [t('aiOnboarding.days.sat')]: 6, 
    [t('aiOnboarding.days.sun')]: 0
  };

  const focusAreaMapping: Record<string, { group: 'upper_body' | 'lower_body', value: string }> = {
    [t('aiOnboarding.bodyParts.chest')]: { group: 'upper_body', value: 'chest' },
    [t('aiOnboarding.bodyParts.back')]: { group: 'upper_body', value: 'back' },
    [t('aiOnboarding.bodyParts.shoulders')]: { group: 'upper_body', value: 'shoulders' },
    [t('aiOnboarding.bodyParts.arms')]: { group: 'upper_body', value: 'arms' },
    [t('aiOnboarding.bodyParts.legs')]: { group: 'lower_body', value: 'quads' },
    [t('aiOnboarding.bodyParts.core')]: { group: 'lower_body', value: 'core' }
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ai',
      content: t('aiOnboarding.welcome'),
      type: 'buttons',
      options: [
        { value: 'strength', label: t('aiOnboarding.goals.strength') },
        { value: 'hypertrophy', label: t('aiOnboarding.goals.hypertrophy') },
        { value: 'fat_loss', label: t('aiOnboarding.goals.fatLoss') },
        { value: 'endurance', label: t('aiOnboarding.goals.endurance') }
      ],
      awaitingInput: true
    }
  ]);
  const [step, setStep] = useState(1);
  const [data, setData] = useState<ConversationData>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [tempInput, setTempInput] = useState<any>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (message: Message) => {
    setMessages(prev => prev.map(m => ({ ...m, awaitingInput: false })).concat({ ...message, awaitingInput: message.awaitingInput || false }));
  };

  const formatUserResponse = (value: any, type: string): string => {
    if (type === 'buttons') {
      const labels: Record<string, string> = {
        'strength': t('aiOnboarding.goals.strength'),
        'hypertrophy': t('aiOnboarding.goals.hypertrophy'),
        'fat_loss': t('aiOnboarding.goals.fatLoss'),
        'endurance': t('aiOnboarding.goals.endurance'),
        'beginner': t('aiOnboarding.experienceLevels.beginner'),
        'intermediate': t('aiOnboarding.experienceLevels.intermediate'),
        'advanced': t('aiOnboarding.experienceLevels.advanced'),
        'full_gym': t('aiOnboarding.equipmentOptions.fullGym'),
        'dumbbells': t('aiOnboarding.equipmentOptions.dumbbells'),
        'bodyweight': t('aiOnboarding.equipmentOptions.bodyweight')
      };
      return labels[value] || value;
    }
    if (type === 'multiselect' && Array.isArray(value)) {
      return value.join(', ');
    }
    if (type === 'slider') {
      const stressLevels: Record<number, string> = {
        1: t('aiOnboarding.stressLevels.1'),
        2: t('aiOnboarding.stressLevels.2'),
        3: t('aiOnboarding.stressLevels.3'),
        4: t('aiOnboarding.stressLevels.4'),
        5: t('aiOnboarding.stressLevels.5')
      };
      return stressLevels[value] || value.toString();
    }
    return value?.toString() || '';
  };

  const getNextStep = (currentStep: number, currentData: ConversationData): Message | null => {
    switch (currentStep) {
      case 2:
        return {
          id: Date.now().toString(),
          role: 'ai',
          content: t('aiOnboarding.experience'),
          type: 'buttons',
          options: [
            { value: 'beginner', label: t('aiOnboarding.experienceLevels.beginner') },
            { value: 'intermediate', label: t('aiOnboarding.experienceLevels.intermediate') },
            { value: 'advanced', label: t('aiOnboarding.experienceLevels.advanced') }
          ],
          awaitingInput: true
        };
      case 3:
        return {
          id: Date.now().toString(),
          role: 'ai',
          content: t('aiOnboarding.trainingDays'),
          type: 'multiselect',
          options: [
            { value: t('aiOnboarding.days.mon'), label: t('aiOnboarding.days.mon') },
            { value: t('aiOnboarding.days.tue'), label: t('aiOnboarding.days.tue') },
            { value: t('aiOnboarding.days.wed'), label: t('aiOnboarding.days.wed') },
            { value: t('aiOnboarding.days.thu'), label: t('aiOnboarding.days.thu') },
            { value: t('aiOnboarding.days.fri'), label: t('aiOnboarding.days.fri') },
            { value: t('aiOnboarding.days.sat'), label: t('aiOnboarding.days.sat') },
            { value: t('aiOnboarding.days.sun'), label: t('aiOnboarding.days.sun') }
          ],
          awaitingInput: true
        };
      case 4:
        return {
          id: Date.now().toString(),
          role: 'ai',
          content: t('aiOnboarding.equipment'),
          type: 'buttons',
          options: [
            { value: 'full_gym', label: t('aiOnboarding.equipmentOptions.fullGym') },
            { value: 'dumbbells', label: t('aiOnboarding.equipmentOptions.dumbbells') },
            { value: 'bodyweight', label: t('aiOnboarding.equipmentOptions.bodyweight') }
          ],
          awaitingInput: true
        };
      case 5:
        return {
          id: Date.now().toString(),
          role: 'ai',
          content: t('aiOnboarding.stress'),
          type: 'slider',
          options: {
            min: 1,
            max: 5,
            minLabel: t('aiOnboarding.stressLabels.min'),
            maxLabel: t('aiOnboarding.stressLabels.max')
          },
          awaitingInput: true
        };
      case 6:
        return {
          id: Date.now().toString(),
          role: 'ai',
          content: t('aiOnboarding.sleepHours'),
          type: 'number',
          options: {
            placeholder: t('aiOnboarding.placeholders.sleepExample'),
            min: 4,
            max: 12
          },
          awaitingInput: true
        };
      case 7:
        return {
          id: Date.now().toString(),
          role: 'ai',
          content: t('aiOnboarding.focusAreas'),
          type: 'multiselect',
          options: [
            { value: t('aiOnboarding.bodyParts.chest'), label: t('aiOnboarding.bodyParts.chest') },
            { value: t('aiOnboarding.bodyParts.back'), label: t('aiOnboarding.bodyParts.back') },
            { value: t('aiOnboarding.bodyParts.shoulders'), label: t('aiOnboarding.bodyParts.shoulders') },
            { value: t('aiOnboarding.bodyParts.arms'), label: t('aiOnboarding.bodyParts.arms') },
            { value: t('aiOnboarding.bodyParts.legs'), label: t('aiOnboarding.bodyParts.legs') },
            { value: t('aiOnboarding.bodyParts.core'), label: t('aiOnboarding.bodyParts.core') }
          ],
          awaitingInput: true
        };
      case 8:
        return {
          id: Date.now().toString(),
          role: 'ai',
          content: t('aiOnboarding.liftingStyles'),
          type: 'lifting-styles',
          awaitingInput: true
        };
      case 9:
        return {
          id: Date.now().toString(),
          role: 'ai',
          content: t('aiOnboarding.oneRepMax'),
          type: 'number',
          options: {
            placeholder: '',
            allowSkip: true,
            fields: ['squat', 'bench', 'deadlift'],
            labels: [t('aiOnboarding.labels.squatWeight'), t('aiOnboarding.labels.benchWeight'), t('aiOnboarding.labels.deadliftWeight')]
          },
          awaitingInput: true
        };
      case 10:
        return {
          id: Date.now().toString(),
          role: 'ai',
          content: t('aiOnboarding.injuries'),
          type: 'textinput',
          options: {
            placeholder: t('aiOnboarding.placeholders.injuries'),
            allowSkip: true
          },
          awaitingInput: true
        };
      default:
        return null;
    }
  };

  const handleUserResponse = async (value: any, messageType: string) => {
    // Update data based on current step
    let updatedData = { ...data };
    
    switch (step) {
      case 1:
        updatedData.primary_goal = value;
        break;
      case 2:
        updatedData.experience_level = value;
        break;
      case 3:
        updatedData.training_days = value.map((day: string) => dayMapping[day]);
        break;
      case 4:
        updatedData.equipment = value;
        break;
      case 5:
        updatedData.job_stress = value;
        break;
      case 6:
        updatedData.average_sleep_hours = parseInt(value);
        break;
      case 7:
        updatedData.focus_areas_selected = value;
        break;
      case 8:
        updatedData.lifting_styles = value;
        break;
      case 9:
        if (value && Object.keys(value).length > 0) {
          updatedData.current_1rm = value;
        }
        break;
      case 10:
        updatedData.injuries_limitations = value || '';
        break;
    }
    
    setData(updatedData);

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: formatUserResponse(value, messageType)
    };
    addMessage(userMessage);

    // Move to next step or finish
    const nextStep = step + 1;
    setStep(nextStep);
    
    if (nextStep <= 10) {
      setTimeout(() => {
        const nextMessage = getNextStep(nextStep, updatedData);
        if (nextMessage) {
          addMessage(nextMessage);
        }
      }, 500);
    } else {
      // All steps completed - generate plan
      await handleGeneratePlan(updatedData);
    }
    
    setTempInput({});
  };

  const handleGeneratePlan = async (finalData: ConversationData) => {
    setIsGenerating(true);
    
    const finalMessage: Message = {
      id: Date.now().toString(),
      role: 'ai',
      content: t('aiOnboarding.generating')
    };
    addMessage(finalMessage);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Map focus areas to proper format
      const focusAreas = {
        upper_body: (finalData.focus_areas_selected || [])
          .filter(area => focusAreaMapping[area]?.group === 'upper_body')
          .map(area => focusAreaMapping[area].value),
        lower_body: (finalData.focus_areas_selected || [])
          .filter(area => focusAreaMapping[area]?.group === 'lower_body')
          .map(area => focusAreaMapping[area].value)
      };

      // Map stress level
      const stressMapping: Record<number, string> = {
        1: 'low', 2: 'low', 3: 'moderate', 4: 'high', 5: 'high'
      };

      // Save preferences
      const { error: prefError } = await supabase
        .from('ai_training_preferences')
        .upsert({
          user_id: user.id,
          primary_goal: finalData.primary_goal || 'hypertrophy',
          experience_level: finalData.experience_level || 'intermediate',
          days_per_week: finalData.training_days?.length || 4,
          training_days: finalData.training_days || [1, 3, 5],
          equipment: finalData.equipment,
          recovery_profile: {
            job_stress: stressMapping[finalData.job_stress || 3],
            average_sleep_hours: finalData.average_sleep_hours || 7
          },
          focus_areas: focusAreas,
          lifting_styles: finalData.lifting_styles || {},
          current_1rm: finalData.current_1rm || {},
          injuries_limitations: finalData.injuries_limitations || ''
        });
      
      if (prefError) throw prefError;
      
      // Generate plan
      const { data: planData, error } = await aiTrainingApi.generatePlan(user.id);
      
      if (error) throw error;
      
      const successMessage: Message = {
        id: Date.now().toString(),
        role: 'ai',
        content: t('aiOnboarding.planCreated', { name: planData.program_data.program_name })
      };
      addMessage(successMessage);
      
      toast({
        title: t('aiOnboarding.planCreatedToast'),
        description: t('aiOnboarding.planCreatedDesc')
      });
      
      setTimeout(() => {
        onSuccess();
      }, 1500);
      
    } catch (error: any) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'ai',
        content: t('aiOnboarding.errorMessage', { message: error.message })
      };
      addMessage(errorMessage);
      
      toast({
        title: t('aiOnboarding.error'),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const renderInput = (message: Message) => {
    if (!message.awaitingInput) return null;

    switch (message.type) {
      case 'buttons':
        return (
          <div className="flex flex-wrap gap-2 mt-3">
            {message.options.map((option: any) => (
              <Button 
                key={option.value}
                size="sm"
                variant="outline"
                onClick={() => handleUserResponse(option.value, 'buttons')}
                className="hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {option.label}
              </Button>
            ))}
          </div>
        );
      
      case 'multiselect':
        const selectedValues = tempInput.selected || [];
        return (
          <div className="space-y-3 mt-3">
            <div className="flex flex-wrap gap-2">
              {message.options.map((option: any) => (
                <Badge 
                  key={option.value}
                  variant={selectedValues.includes(option.value) ? "default" : "outline"}
                  className="cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => {
                    const newSelected = selectedValues.includes(option.value)
                      ? selectedValues.filter((v: string) => v !== option.value)
                      : [...selectedValues, option.value];
                    setTempInput({ ...tempInput, selected: newSelected });
                  }}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
            <Button 
              size="sm" 
              onClick={() => handleUserResponse(selectedValues, 'multiselect')}
              disabled={selectedValues.length === 0}
            >
              {t('aiOnboarding.buttons.continue')}
            </Button>
          </div>
        );
      
      case 'slider':
        const sliderValue = tempInput.sliderValue || 3;
        return (
          <div className="space-y-4 mt-3">
            <Slider 
              value={[sliderValue]}
              onValueChange={([value]) => setTempInput({ ...tempInput, sliderValue: value })}
              min={message.options.min}
              max={message.options.max}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{message.options.minLabel}</span>
              <span className="font-semibold text-foreground">{sliderValue}</span>
              <span>{message.options.maxLabel}</span>
            </div>
            <Button size="sm" onClick={() => handleUserResponse(sliderValue, 'slider')}>
              {t('aiOnboarding.buttons.continue')}
            </Button>
          </div>
        );
      
      case 'number':
        if (message.options.fields) {
          // Multiple number inputs for 1RMs
          return (
            <div className="space-y-3 mt-3">
              {message.options.fields.map((field: string, idx: number) => (
                <div key={field}>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {message.options.labels[idx]}
                  </label>
                  <Input 
                    type="number"
                    placeholder="0"
                    value={tempInput[field] || ''}
                    onChange={(e) => setTempInput({ ...tempInput, [field]: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full"
                  />
                </div>
              ))}
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => {
                    const values: any = {};
                    message.options.fields.forEach((field: string) => {
                      if (tempInput[field]) values[field] = tempInput[field];
                    });
                    handleUserResponse(values, 'number');
                  }}
                >
                  {t('aiOnboarding.buttons.continue')}
                </Button>
                {message.options.allowSkip && (
                  <Button size="sm" variant="outline" onClick={() => handleUserResponse({}, 'number')}>
                    {t('aiOnboarding.buttons.skip')}
                  </Button>
                )}
              </div>
            </div>
          );
        }
        
        return (
          <div className="space-y-2 mt-3">
            <Input 
              type="number"
              placeholder={message.options.placeholder}
              value={tempInput.numberValue || ''}
              onChange={(e) => setTempInput({ ...tempInput, numberValue: e.target.value })}
              min={message.options.min}
              max={message.options.max}
            />
            <Button 
              size="sm" 
              onClick={() => handleUserResponse(tempInput.numberValue, 'number')}
              disabled={!tempInput.numberValue}
            >
              {t('aiOnboarding.buttons.continue')}
            </Button>
          </div>
        );
      
      case 'lifting-styles':
        const styles = tempInput.styles || {};
        return (
          <div className="space-y-4 mt-3">
            <div>
              <label className="text-sm font-medium mb-2 block">{t('aiOnboarding.labels.squat')}</label>
              <div className="flex flex-wrap gap-2">
                {['high_bar', 'low_bar', 'front', 'unknown'].map(style => (
                  <Button
                    key={style}
                    size="sm"
                    variant={styles.squat === style ? "default" : "outline"}
                    onClick={() => setTempInput({ ...tempInput, styles: { ...styles, squat: style } })}
                  >
                    {style === 'high_bar' ? t('aiOnboarding.squatStyles.highBar') : 
                     style === 'low_bar' ? t('aiOnboarding.squatStyles.lowBar') : 
                     style === 'front' ? t('aiOnboarding.squatStyles.front') : t('aiOnboarding.squatStyles.unknown')}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{t('aiOnboarding.labels.deadlift')}</label>
              <div className="flex flex-wrap gap-2">
                {['conventional', 'sumo', 'trap_bar', 'unknown'].map(style => (
                  <Button
                    key={style}
                    size="sm"
                    variant={styles.deadlift === style ? "default" : "outline"}
                    onClick={() => setTempInput({ ...tempInput, styles: { ...styles, deadlift: style } })}
                  >
                    {style === 'conventional' ? t('aiOnboarding.deadliftStyles.conventional') : 
                     style === 'sumo' ? t('aiOnboarding.deadliftStyles.sumo') : 
                     style === 'trap_bar' ? t('aiOnboarding.deadliftStyles.trapBar') : t('aiOnboarding.deadliftStyles.unknown')}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{t('aiOnboarding.labels.bench')}</label>
              <div className="flex flex-wrap gap-2">
                {['flat', 'incline', 'close_grip', 'unknown'].map(style => (
                  <Button
                    key={style}
                    size="sm"
                    variant={styles.bench === style ? "default" : "outline"}
                    onClick={() => setTempInput({ ...tempInput, styles: { ...styles, bench: style } })}
                  >
                    {style === 'flat' ? t('aiOnboarding.benchStyles.flat') : 
                     style === 'incline' ? t('aiOnboarding.benchStyles.incline') : 
                     style === 'close_grip' ? t('aiOnboarding.benchStyles.closeGrip') : t('aiOnboarding.benchStyles.unknown')}
                  </Button>
                ))}
              </div>
            </div>
            <Button 
              size="sm" 
              onClick={() => handleUserResponse(styles, 'lifting-styles')}
              disabled={!styles.squat || !styles.deadlift || !styles.bench}
            >
              {t('aiOnboarding.buttons.continue')}
            </Button>
          </div>
        );
      
      case 'textinput':
        return (
          <div className="space-y-2 mt-3">
            <Textarea 
              placeholder={message.options.placeholder}
              value={tempInput.textValue || ''}
              onChange={(e) => setTempInput({ ...tempInput, textValue: e.target.value })}
              rows={3}
              className="resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleUserResponse(tempInput.textValue || '', 'textinput')}>
                {t('aiOnboarding.buttons.continue')}
              </Button>
              {message.options.allowSkip && (
                <Button size="sm" variant="outline" onClick={() => handleUserResponse('', 'textinput')}>
                  {t('aiOnboarding.buttons.noLimitations')}
                </Button>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(step / 10) * 100}%` }}
          />
        </div>
        
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Training Setup
            </span>
            <Badge variant="secondary">{step}/10</Badge>
          </DialogTitle>
        </DialogHeader>
        
        {/* Messages Container */}
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 py-4">
            {messages.map((message, idx) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%]`}>
                  {message.role === 'ai' && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-lg">
                        🤖
                      </div>
                      <div className="flex-1">
                        <div className="bg-muted p-3 rounded-lg">
                          <p className="text-sm">{message.content}</p>
                        </div>
                        {renderInput(message)}
                      </div>
                    </div>
                  )}
                  
                  {message.role === 'user' && (
                    <div className="bg-primary text-primary-foreground p-3 rounded-lg">
                      <p className="text-sm">{message.content}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            
            {/* Typing Indicator */}
            {isGenerating && (
              <div className="flex justify-start">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                    🤖
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
