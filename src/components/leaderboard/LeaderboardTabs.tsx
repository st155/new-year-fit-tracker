import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Flame, Calendar, Award } from "lucide-react";

interface LeaderboardTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function LeaderboardTabs({ activeTab, onTabChange }: LeaderboardTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overall" className="gap-2">
          <Trophy className="h-4 w-4" />
          <span className="hidden sm:inline">Overall</span>
        </TabsTrigger>
        <TabsTrigger value="week" className="gap-2">
          <Flame className="h-4 w-4" />
          <span className="hidden sm:inline">This Week</span>
        </TabsTrigger>
        <TabsTrigger value="month" className="gap-2">
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">This Month</span>
        </TabsTrigger>
        <TabsTrigger value="achievements" className="gap-2">
          <Award className="h-4 w-4" />
          <span className="hidden sm:inline">Achievements</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
