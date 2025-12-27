import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Flame, Calendar, Award, Activity, Moon, TrendingUp, Scale } from "lucide-react";
import { useTranslation } from 'react-i18next';

interface LeaderboardTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function LeaderboardTabs({ activeTab, onTabChange }: LeaderboardTabsProps) {
  const { t } = useTranslation('leaderboard');
  
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto">
        {/* Time-based tabs */}
        <TabsTrigger value="overall" className="gap-1.5 text-xs sm:text-sm px-2 py-2">
          <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">{t('tabs.overall', 'Overall')}</span>
        </TabsTrigger>
        <TabsTrigger value="week" className="gap-1.5 text-xs sm:text-sm px-2 py-2">
          <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">{t('tabs.week', 'Week')}</span>
        </TabsTrigger>
        <TabsTrigger value="month" className="gap-1.5 text-xs sm:text-sm px-2 py-2">
          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">{t('tabs.month', 'Month')}</span>
        </TabsTrigger>
        
        {/* Category-based tabs */}
        <TabsTrigger value="activity" className="gap-1.5 text-xs sm:text-sm px-2 py-2 text-orange-500 data-[state=active]:text-orange-600">
          <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden lg:inline">{t('tabs.activity', 'Activity')}</span>
        </TabsTrigger>
        <TabsTrigger value="recovery" className="gap-1.5 text-xs sm:text-sm px-2 py-2 text-blue-500 data-[state=active]:text-blue-600">
          <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden lg:inline">{t('tabs.recovery', 'Recovery')}</span>
        </TabsTrigger>
        <TabsTrigger value="progress" className="gap-1.5 text-xs sm:text-sm px-2 py-2 text-green-500 data-[state=active]:text-green-600">
          <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden lg:inline">{t('tabs.progress', 'Progress')}</span>
        </TabsTrigger>
        <TabsTrigger value="balance" className="gap-1.5 text-xs sm:text-sm px-2 py-2 text-purple-500 data-[state=active]:text-purple-600">
          <Scale className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden lg:inline">{t('tabs.balance', 'Balance')}</span>
        </TabsTrigger>
        
        {/* Achievements */}
        <TabsTrigger value="achievements" className="gap-1.5 text-xs sm:text-sm px-2 py-2">
          <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden lg:inline">{t('tabs.achievements', 'Awards')}</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

export type RankingType = 'overall' | 'activity' | 'recovery' | 'progress' | 'balance';
