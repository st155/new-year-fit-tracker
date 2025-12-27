import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Settings, Eye, Calendar, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AdjustedExercise } from "@/hooks/useDailyWorkout";
import PlanViewerDialog from "@/components/workout/PlanViewerDialog";

interface TodaysPlanCardProps {
  exercises: AdjustedExercise[];
  workoutName?: string;
  planId?: string;
  planName?: string;
  weekNumber?: number;
  totalWeeks?: number;
  weeklySchedule?: Array<{ day: number; name: string }>;
}

export function TodaysPlanCard({
  exercises, 
  workoutName,
  planId,
  planName,
  weekNumber = 1,
  totalWeeks = 12,
  weeklySchedule = []
}: TodaysPlanCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('workouts');
  const [showPlanViewer, setShowPlanViewer] = useState(false);
  
  const DAY_NAMES_SHORT = [
    t('dayNames.sun'),
    t('dayNames.mon'),
    t('dayNames.tue'),
    t('dayNames.wed'),
    t('dayNames.thu'),
    t('dayNames.fri'),
    t('dayNames.sat')
  ];
  
  const today = new Date().getDay();
  
  return (
    <>
      <Card className="bg-neutral-900 border border-neutral-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {workoutName || t('planViewer.defaultTitle')} 
              {exercises.length > 0 && (
                <span className="text-sm text-cyan-400 ml-2">({t('todaysPlan.aiAdjusted')})</span>
              )}
            </CardTitle>
            <div className="flex gap-2">
              {planId && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowPlanViewer(true)}
                  className="border-cyan-500/30 hover:border-cyan-500 text-cyan-400"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {t('todaysPlan.plan')}
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/workouts/manage')}
                className="border-neutral-700 hover:border-neutral-600"
              >
                <Settings className="w-4 h-4 mr-2" />
                {t('todaysPlan.manage')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {exercises.length === 0 ? (
            <div className="space-y-4">
              {/* Weekly schedule for rest days */}
              {weeklySchedule.length > 0 && (
                <div className="bg-neutral-800/50 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{t('todaysPlan.weekSchedule')}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {DAY_NAMES_SHORT.map((day, idx) => {
                      const scheduled = weeklySchedule.find(s => s.day === idx);
                      const isToday = idx === today;
                      
                      return (
                        <div
                          key={day}
                          className={`flex flex-col items-center p-2 rounded-lg min-w-[48px] ${
                            isToday
                              ? 'bg-cyan-500/20 border border-cyan-500/30'
                              : scheduled
                              ? 'bg-neutral-800'
                              : 'bg-neutral-800/30 opacity-50'
                          }`}
                        >
                          <span className={`text-xs font-medium ${isToday ? 'text-cyan-400' : 'text-muted-foreground'}`}>
                            {day}
                          </span>
                          {scheduled ? (
                            <span className="text-[10px] text-foreground mt-1 text-center line-clamp-1">
                              {scheduled.name.split(' ')[0]}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground mt-1">—</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">
                  {weeklySchedule.length > 0 ? t('todaysPlan.restDay') : t('todaysPlan.noPlan')}
                </p>
                {planId ? (
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPlanViewer(true)}
                    className="border-cyan-500/30 hover:border-cyan-500 text-cyan-400"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {t('todaysPlan.viewFullPlan')}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/workouts/manage')}
                    className="border-neutral-700 hover:border-cyan-500"
                  >
                    {t('todaysPlan.createPlan')}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {exercises.map((exercise, idx) => (
                <div key={idx} className="border-l-2 border-neutral-700 pl-4 py-2">
                  <div className="font-semibold text-foreground">{exercise.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {exercise.sets} x {exercise.reps} {t('todaysPlan.reps')}
                    {exercise.weight && (
                      <span className={exercise.was_modified ? "text-cyan-400 ml-2 font-medium" : "ml-2"}>
                        @ {exercise.weight} кг
                        {exercise.was_modified && (
                          <Sparkles className="w-3 h-3 inline ml-1 text-cyan-400" />
                        )}
                      </span>
                    )}
                  </div>
                  {exercise.rir && (
                    <div className="text-xs text-muted-foreground mt-1">
                      RIR: {exercise.rir}
                    </div>
                  )}
                  {exercise.adjustment_reason && exercise.was_modified && (
                    <div className="text-xs text-cyan-400/70 mt-1 italic">
                      {exercise.adjustment_reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {planId && (
        <PlanViewerDialog
          open={showPlanViewer}
          onOpenChange={setShowPlanViewer}
          planId={planId}
          planName={planName}
          weekNumber={weekNumber}
          totalWeeks={totalWeeks}
        />
      )}
    </>
  );
}
