import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Target, BarChart3, Calendar, MessageSquare, TrendingUp, Brain, Activity, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AIPhotoUpload } from "@/components/ui/ai-photo-upload";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface QuickActionsProps {
  userRole: "participant" | "trainer";
}

export function QuickActions({ userRole }: QuickActionsProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);

  if (userRole === "trainer") {
    return (
      <div className="space-y-4 animate-fade-in">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2 px-1">
          <BarChart3 className="h-4 w-4 text-primary" />
          Trainer Panel
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger-fade-in">
          <Card 
            className="border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 hover:border-primary/40 transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] cursor-pointer group"
            onClick={() => navigate('/trainer-dashboard')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <span className="font-semibold text-foreground">Control Panel</span>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className="border-2 border-accent/20 bg-gradient-to-br from-accent/10 to-accent/5 hover:border-accent/40 transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] cursor-pointer group"
            onClick={() => navigate('/trainer-dashboard')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-accent/10 group-hover:bg-accent/20 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
                  <MessageSquare className="h-5 w-5 text-accent" />
                </div>
                <span className="font-semibold text-foreground">Client Messages</span>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/5 hover:border-blue-500/40 transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] cursor-pointer group"
            onClick={() => navigate('/trainer-dashboard')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
                  <Calendar className="h-5 w-5 text-blue-500" />
                </div>
                <span className="font-semibold text-foreground">Training Plans</span>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className="border-2 border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-500/5 hover:border-purple-500/40 transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] cursor-pointer group"
            onClick={() => navigate('/trainer-dashboard')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
                  <Target className="h-5 w-5 text-purple-500" />
                </div>
                <span className="font-semibold text-foreground">Goals Management</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Compact grid - 3 columns */}
      <div className="grid grid-cols-3 gap-2 stagger-fade-in">
        {/* Row 1 */}
        <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
          <DialogTrigger asChild>
            <button className="group h-20 rounded-2xl border-0 bg-gradient-to-br from-orange-400 via-red-500 to-pink-600 text-white cursor-pointer hover:scale-105 active:scale-95 transition-all duration-500 shadow-lg hover:shadow-2xl flex flex-col items-center justify-center gap-1.5 p-3">
              <Brain className="h-5 w-5 transition-all duration-500 group-hover:scale-110 group-hover:rotate-12" />
              <span className="text-[10px] font-semibold">AI Analysis</span>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>AI Fitness Tracker Analysis</DialogTitle>
            </DialogHeader>
            <AIPhotoUpload
              onDataExtracted={(result) => {
                if (result.success && result.saved) {
                  setIsAIDialogOpen(false);
                  navigate('/');
                }
              }}
              label="Upload tracker screenshot"
            />
          </DialogContent>
        </Dialog>
        
        <button 
          className="h-20 rounded-2xl border-0 bg-gradient-to-br from-green-400 via-teal-500 to-cyan-600 text-white cursor-pointer hover:scale-105 active:scale-95 transition-all duration-500 shadow-lg hover:shadow-2xl flex flex-col items-center justify-center gap-1.5 p-3 group"
          onClick={() => navigate('/progress')}
        >
          <Upload className="h-5 w-5 transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-1" />
          <span className="text-[10px] font-semibold">Upload</span>
        </button>
        
        <button 
          className="h-20 rounded-2xl border-0 bg-gradient-to-br from-blue-400 via-purple-500 to-violet-600 text-white cursor-pointer hover:scale-105 active:scale-95 transition-all duration-500 shadow-lg hover:shadow-2xl flex flex-col items-center justify-center gap-1.5 p-3 group"
          onClick={() => navigate('/goals/create')}
        >
          <Target className="h-5 w-5 transition-all duration-500 group-hover:scale-110 group-hover:rotate-90" />
          <span className="text-[10px] font-semibold">New Goal</span>
        </button>
      </div>
      
      {/* Row 2 */}
      <div className="grid grid-cols-3 gap-2 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <button 
          className="h-16 rounded-2xl border-0 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 text-white cursor-pointer hover:scale-105 active:scale-95 transition-all duration-500 shadow-lg hover:shadow-2xl flex items-center gap-2 justify-center px-3 group"
          onClick={() => navigate('/progress')}
        >
          <div className="p-1 rounded-full bg-white/20 transition-all duration-500 group-hover:scale-110">
            <TrendingUp className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold">Progress</span>
        </button>

        <button 
          className="h-16 rounded-2xl border-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-orange-600 text-white cursor-pointer hover:scale-105 active:scale-95 transition-all duration-500 shadow-lg hover:shadow-2xl flex items-center gap-2 justify-center px-3 group"
          onClick={() => navigate('/leaderboard')}
        >
          <div className="p-1 rounded-full bg-white/20 transition-all duration-500 group-hover:scale-110 group-hover:rotate-12">
            <Trophy className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold">Leaderboard</span>
        </button>

        <button 
          className="h-16 rounded-2xl border-0 bg-gradient-to-br from-purple-400 via-violet-500 to-purple-600 text-white cursor-pointer hover:scale-105 active:scale-95 transition-all duration-500 shadow-lg hover:shadow-2xl flex items-center gap-2 justify-center px-3 group"
          onClick={() => navigate('/fitness-data')}
        >
          <div className="p-1 rounded-full bg-white/20 transition-all duration-500 group-hover:scale-110">
            <Activity className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold">Data</span>
        </button>
      </div>
      
      {/* Tip card - more compact */}
      <button 
        className="w-full rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background hover:border-primary/40 transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] cursor-pointer p-3 animate-fade-in group"
        style={{ animationDelay: '200ms' }}
        onClick={() => navigate('/integrations')}
      >
        <div className="flex items-start gap-2.5">
          <div className="text-xl shrink-0 transition-all duration-500 group-hover:scale-110 group-hover:rotate-12">💡</div>
          <div className="text-left space-y-0.5">
            <p className="text-xs font-semibold text-primary">Tip of the Day</p>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Connect fitness trackers to automatically collect all your health and activity metrics!
            </p>
          </div>
        </div>
      </button>
    </div>
  );
}