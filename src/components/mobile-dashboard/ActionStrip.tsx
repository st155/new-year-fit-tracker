import { motion } from 'framer-motion';
import { Pill, Dumbbell, Droplets, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ActionPill {
  id: string;
  icon: React.ReactNode;
  label: string;
  subLabel?: string;
  href: string;
  variant?: 'default' | 'active' | 'warning';
}

export function ActionStrip() {
  // TODO: Connect to real data hooks
  const supplementsProgress = { taken: 3, total: 9 };
  const hasWorkoutToday = true;
  const weighedToday = false;

  const actions: ActionPill[] = [
    {
      id: 'supplements',
      icon: <Pill className="h-4 w-4" />,
      label: `${supplementsProgress.taken}/${supplementsProgress.total}`,
      href: '/supplements',
      variant: supplementsProgress.taken === supplementsProgress.total ? 'active' : 'default',
    },
    {
      id: 'workout',
      icon: <Dumbbell className="h-4 w-4" />,
      label: 'Workout',
      href: '/training',
      variant: hasWorkoutToday ? 'warning' : 'default',
    },
    {
      id: 'water',
      icon: <Droplets className="h-4 w-4" />,
      label: '+250ml',
      href: '/habits',
      variant: 'default',
    },
    ...(!weighedToday ? [{
      id: 'weight',
      icon: <Scale className="h-4 w-4" />,
      label: 'Weigh in',
      href: '/habits',
      variant: 'default' as const,
    }] : []),
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.4 }}
      className="flex gap-2 overflow-x-auto pb-1 px-4 scrollbar-hide"
    >
      {actions.map((action, index) => (
        <motion.div
          key={action.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 + index * 0.1 }}
        >
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "flex items-center gap-2 rounded-full px-4 h-9 whitespace-nowrap",
              "bg-card/50 border-border/50 hover:bg-card hover:border-border",
              action.variant === 'active' && "bg-success/20 border-success/50 text-success",
              action.variant === 'warning' && "bg-warning/20 border-warning/50 text-warning"
            )}
            asChild
          >
            <Link to={action.href}>
              {action.icon}
              <span className="text-sm font-medium">{action.label}</span>
            </Link>
          </Button>
        </motion.div>
      ))}
    </motion.div>
  );
}
