import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, Share, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

interface QuickSettingsProps {
  preferences: {
    notifications: boolean;
    email_updates: boolean;
    progress_sharing: boolean;
  };
  trainerMode: boolean;
  onPreferenceChange: (key: 'notifications' | 'email_updates' | 'progress_sharing', value: boolean) => void;
  onTrainerModeChange: (value: boolean) => void;
  isLoading?: boolean;
}

const settingsItems = [
  { 
    key: 'notifications' as const, 
    icon: Bell, 
    label: 'Уведомления',
    iconColor: 'text-yellow-500'
  },
  { 
    key: 'email_updates' as const, 
    icon: Mail, 
    label: 'Email',
    iconColor: 'text-blue-500'
  },
  { 
    key: 'progress_sharing' as const, 
    icon: Share, 
    label: 'Публичный прогресс',
    iconColor: 'text-purple-500'
  },
];

export function QuickSettings({
  preferences,
  trainerMode,
  onPreferenceChange,
  onTrainerModeChange,
  isLoading
}: QuickSettingsProps) {
  if (isLoading) {
    return (
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          ⚡ Быстрые настройки
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {settingsItems.map((item, index) => {
            const Icon = item.icon;
            const isEnabled = preferences[item.key];
            
            return (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className={`
                  relative p-3 rounded-lg border cursor-pointer transition-all
                  ${isEnabled 
                    ? 'border-primary/30 bg-primary/5' 
                    : 'border-border bg-muted/30 hover:bg-muted/50'
                  }
                `}
                onClick={() => onPreferenceChange(item.key, !isEnabled)}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`h-4 w-4 ${item.iconColor}`} />
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => onPreferenceChange(item.key, checked)}
                    className="scale-75"
                  />
                </div>
                <p className="text-xs font-medium truncate">{item.label}</p>
              </motion.div>
            );
          })}
          
          {/* Trainer Mode - special styling */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.15 }}
            className={`
              relative p-3 rounded-lg border cursor-pointer transition-all
              ${trainerMode 
                ? 'border-green-500/30 bg-green-500/10' 
                : 'border-border bg-muted/30 hover:bg-muted/50'
              }
            `}
            onClick={() => onTrainerModeChange(!trainerMode)}
          >
            <div className="flex items-center justify-between mb-2">
              <Target className={`h-4 w-4 ${trainerMode ? 'text-green-500' : 'text-muted-foreground'}`} />
              <Switch
                checked={trainerMode}
                onCheckedChange={onTrainerModeChange}
                className="scale-75"
              />
            </div>
            <div className="flex items-center gap-1">
              <p className="text-xs font-medium">Тренер</p>
              {trainerMode && (
                <Badge className="text-[10px] px-1 py-0 bg-green-500/20 text-green-600 border-0">
                  ON
                </Badge>
              )}
            </div>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}
