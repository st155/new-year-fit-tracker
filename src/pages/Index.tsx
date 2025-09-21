import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { GoalsSection } from "@/components/dashboard/goals-section";
import { Leaderboard } from "@/components/dashboard/leaderboard";
import { QuickActions } from "@/components/dashboard/quick-actions";

const Index = () => {
  // Mock user data - в реальном приложении будет из API/базы данных
  const [userRole] = useState<"participant" | "trainer">("participant");
  const userName = "Дмитрий";
  
  // Рассчитываем дни до конца челленджа (31 декабря)
  const challengeEnd = new Date('2024-12-31');
  const today = new Date();
  const daysLeft = Math.ceil((challengeEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  // Рассчитываем прогресс челленджа (с 15 октября)
  const challengeStart = new Date('2024-10-15');
  const totalDays = Math.ceil((challengeEnd.getTime() - challengeStart.getTime()) / (1000 * 60 * 60 * 24));
  const passedDays = Math.ceil((today.getTime() - challengeStart.getTime()) / (1000 * 60 * 60 * 24));
  const challengeProgress = Math.min(100, Math.max(0, (passedDays / totalDays) * 100));

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        userName={userName}
        userRole={userRole}
        challengeProgress={challengeProgress}
        daysLeft={Math.max(0, daysLeft)}
      />
      
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <StatsGrid userRole={userRole} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <GoalsSection userRole={userRole} />
          </div>
          
          <div className="space-y-6">
            <QuickActions userRole={userRole} />
            <Leaderboard />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
