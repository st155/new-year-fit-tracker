import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Target, 
  CheckCircle2, 
  Dumbbell, 
  Camera,
  Link,
  Sparkles,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIPhotoUpload } from '@/components/ui/ai-photo-upload';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export const QuickActionsPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const actions = [
    {
      icon: Target,
      label: 'Log Measurement',
      onClick: () => {
        navigate('/goals');
        setIsOpen(false);
      },
      color: 'text-primary'
    },
    {
      icon: CheckCircle2,
      label: 'Complete Habit',
      onClick: () => {
        navigate('/habits');
        setIsOpen(false);
      },
      color: 'text-success'
    },
    {
      icon: Sparkles,
      label: 'Привычки 3.0',
      onClick: () => {
        navigate('/habits-v3');
        setIsOpen(false);
      },
      color: 'text-purple-500',
      badge: 'NEW'
    },
    {
      icon: Dumbbell,
      label: 'Log Workout',
      onClick: () => {
        navigate('/fitness-data');
        setIsOpen(false);
      },
      color: 'text-accent'
    },
    {
      icon: Camera,
      label: 'Progress Photo',
      onClick: () => {
        setShowPhotoUpload(true);
        setIsOpen(false);
      },
      color: 'text-secondary'
    },
    {
      icon: Link,
      label: 'Интеграции',
      onClick: () => {
        navigate('/integrations');
        setIsOpen(false);
      },
      color: 'text-purple-500'
    }
  ];

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="absolute bottom-16 right-0 flex flex-col gap-3 mb-2"
            >
              {actions.map((action, index) => (
                <motion.div
                  key={action.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Button
                    onClick={action.onClick}
                    className="h-12 pl-4 pr-5 gap-3 shadow-lg hover:scale-105 transition-transform bg-card border border-border"
                    variant="outline"
                  >
                    <action.icon className={`h-5 w-5 ${action.color}`} />
                    <span className="text-sm font-medium whitespace-nowrap flex items-center gap-2">
                      {action.label}
                      {'badge' in action && action.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                          {action.badge}
                        </span>
                      )}
                    </span>
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="lg"
          className="h-14 w-14 rounded-full shadow-2xl hover:scale-110 transition-all duration-200"
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Plus className="h-6 w-6" />
          )}
        </Button>
      </div>

      <Dialog open={showPhotoUpload} onOpenChange={setShowPhotoUpload}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Progress Photo</DialogTitle>
          </DialogHeader>
          <AIPhotoUpload 
            onDataExtracted={(data) => {
              if (data.success) {
                toast({
                  title: "Success!",
                  description: data.message || "Photo analyzed successfully"
                });
                setShowPhotoUpload(false);
              }
            }}
            label="Upload progress photo for AI analysis"
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
