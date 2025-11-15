import { useReducer, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Bot, User } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ONBOARDING_FLOW, type OnboardingStep } from '@/lib/ai-onboarding-flow';
import { ConnectHealthButtons } from '@/components/workout/onboarding/ConnectHealthButtons';
import { ButtonToggleGroup } from '@/components/workout/onboarding/ButtonToggleGroup';
import { DaySelector } from '@/components/workout/onboarding/DaySelector';
import { MultiSelectChipGroup } from '@/components/workout/onboarding/MultiSelectChipGroup';
import { NumberInputForm } from '@/components/workout/onboarding/NumberInputForm';
import { ImageToggleGroup } from '@/components/workout/onboarding/ImageToggleGroup';
import { GeneratePlanButton } from '@/components/workout/onboarding/GeneratePlanButton';
import { PlanGenerationProgress } from '@/components/workout/PlanGenerationProgress';

interface ChatMessage {
  id: string;
  type: 'ai' | 'user';
  content: string | React.ReactNode;
  timestamp: Date;
}

interface OnboardingState {
  currentStepIndex: number;
  answers: Record<string, any>;
  chatHistory: ChatMessage[];
  isGenerating: boolean;
}

type OnboardingAction =
  | { type: 'NEXT_STEP'; answer?: any; saveKey?: string }
  | { type: 'SET_GENERATING'; value: boolean }
  | { type: 'ADD_MESSAGE'; message: ChatMessage };

function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case 'NEXT_STEP':
      const newAnswers = action.saveKey
        ? { ...state.answers, [action.saveKey]: action.answer }
        : state.answers;
      
      return {
        ...state,
        currentStepIndex: state.currentStepIndex + 1,
        answers: newAnswers
      };
    
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.value };
    
    case 'ADD_MESSAGE':
      // Проверка на дубликаты по id
      const exists = state.chatHistory.some(msg => msg.id === action.message.id);
      if (exists) {
        return state; // Не добавляем дубликат
      }
      return {
        ...state,
        chatHistory: [...state.chatHistory, action.message]
      };
    
    default:
      return state;
  }
}

export default function AITrainingOnboarding() {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showProgress, setShowProgress] = useState(false);
  
  const [state, dispatch] = useReducer(onboardingReducer, {
    currentStepIndex: 0,
    answers: {},
    chatHistory: [],
    isGenerating: false
  });

  const currentStep: OnboardingStep | undefined = ONBOARDING_FLOW[state.currentStepIndex];

  // Auto-transition from message-only steps
  useEffect(() => {
    if (!currentStep) return;
    if (currentStep.type === 'message') {
      const timer = setTimeout(() => {
        dispatch({ type: 'NEXT_STEP' });
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [currentStep?.id, currentStep?.type]);

  useEffect(() => {
    if (currentStep) {
      // Проверяем, что сообщение с таким id еще не добавлено
      const messageExists = state.chatHistory.some(msg => msg.id === currentStep.id);
      
      if (!messageExists) {
        dispatch({
          type: 'ADD_MESSAGE',
          message: {
            id: currentStep.id,
            type: 'ai',
            content: currentStep.aiMessage,
            timestamp: new Date()
          }
        });
      }
    }
  }, [state.currentStepIndex, currentStep?.id, state.chatHistory]);

  useEffect(() => {
    if (scrollRef.current) {
      // Smooth scroll to bottom with animation
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [state.chatHistory, currentStep]);

  const handleAnswer = (answer: any) => {
    if (currentStep?.saveKey) {
      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          id: `${currentStep.id}-answer`,
          type: 'user',
          content: formatAnswer(answer),
          timestamp: new Date()
        }
      });
    }

    dispatch({
      type: 'NEXT_STEP',
      answer,
      saveKey: currentStep?.saveKey
    });
  };

  const handleGenerate = async () => {
    dispatch({ type: 'SET_GENERATING', value: true });
    setShowProgress(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const prefData: any = {
        user_id: user.id,
        primary_goal: state.answers.primary_goal || 'hypertrophy',
        experience_level: state.answers.experience_level || 'beginner',
        days_per_week: state.answers.training_days?.length || 3,
        training_days: state.answers.training_days || [1, 3, 5],
        preferred_workout_duration: parseInt(state.answers.preferred_workout_duration || '60'),
        equipment: ['barbell', 'dumbbell', 'machine']
      };

      if (state.answers.recovery_profile) {
        prefData.recovery_profile = {
          stress_level: state.answers.recovery_profile,
          job_stress: state.answers.recovery_profile === 'high' ? 'high' : 'moderate',
          average_sleep_hours: state.answers.recovery_profile === 'low' ? 8 : 7
        };
      }

      if (state.answers.focus_areas) {
        prefData.focus_areas = {
          primary: state.answers.focus_areas.slice(0, 2),
          secondary: state.answers.focus_areas.slice(2)
        };
      }

      const { error: prefError } = await supabase
        .from('ai_training_preferences')
        .upsert(prefData, { onConflict: 'user_id' });

      if (prefError) throw prefError;

      const { data: fnData, error: funcError } = await supabase.functions.invoke(
        'generate-ai-training-plan',
        { body: { user_id: user.id } }
      );

      if (funcError) {
        // Extract detailed error message from server response
        const serverMsg = (fnData as any)?.error || (funcError as any)?.context?.body || funcError.message;
        throw new Error(typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg));
      }

      toast.success('План создан!');
      navigate('/workouts');

    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Ошибка создания плана');
      setShowProgress(false);
      dispatch({ type: 'SET_GENERATING', value: false });
    }
  };

  const formatAnswer = (answer: any): string => {
    if (Array.isArray(answer)) {
      return answer.join(', ');
    }
    if (typeof answer === 'object') {
      return JSON.stringify(answer);
    }
    return String(answer);
  };

  const renderComponent = () => {
    if (!currentStep?.component) return null;

    switch (currentStep.component.name) {
      case 'ConnectHealthButtons':
        return <ConnectHealthButtons onComplete={() => handleAnswer(null)} />;
      case 'ButtonToggleGroup':
        return <ButtonToggleGroup options={currentStep.component.props.options} onSelect={handleAnswer} />;
      case 'DaySelector':
        return <DaySelector onSelect={handleAnswer} />;
      case 'MultiSelectChipGroup':
        return <MultiSelectChipGroup options={currentStep.component.props.options} onSelect={handleAnswer} />;
      case 'NumberInputForm':
        return <NumberInputForm exercises={currentStep.component.props.exercises} onSubmit={handleAnswer} />;
      case 'ImageToggleGroup':
        return <ImageToggleGroup categories={currentStep.component.props.categories} onSubmit={handleAnswer} />;
      case 'GeneratePlanButton':
        return <GeneratePlanButton label={currentStep.component.props.label} onGenerate={handleGenerate} />;
      default:
        return null;
    }
  };

  if (showProgress) {
    return <PlanGenerationProgress onComplete={() => navigate('/workouts')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/workouts')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">AI Coach</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Chat Area */}
      <div className="pt-16 pb-6 h-screen flex flex-col">
        <ScrollArea ref={scrollRef} className="flex-1 px-4">
          <div className="container mx-auto max-w-2xl py-6 space-y-6">
            <AnimatePresence mode="popLayout">
              {state.chatHistory.map((message, index) => (
                <motion.div
                  key={`${message.id}-${index}`}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.type === 'ai' && (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 ${
                      message.type === 'ai'
                        ? 'bg-card/50 backdrop-blur-sm border border-border'
                        : 'bg-primary/10 border border-primary/20'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>

                  {message.type === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-primary-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Interactive Component */}
              {currentStep && currentStep.type !== 'message' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex justify-center"
                >
                  {renderComponent()}
                </motion.div>
              )}

              {/* Fallback Continue Button for Message Steps */}
              {currentStep && currentStep.type === 'message' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex justify-center"
                >
                  <Button 
                    onClick={() => dispatch({ type: 'NEXT_STEP' })} 
                    variant="default"
                    size="lg"
                  >
                    Продолжить
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
