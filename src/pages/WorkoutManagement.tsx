import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dumbbell, BookOpen, Calendar, ArrowLeft, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import Logbook from "@/components/workout/Logbook";
import TrainingPlan from "@/components/workout/TrainingPlan";

export default function WorkoutManagement() {
  const { t } = useTranslation('workouts');
  const [activeTab, setActiveTab] = useState<"plan" | "logbook">("plan");
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto p-6 space-y-6"
    >
      <Button 
        variant="ghost" 
        onClick={() => navigate('/workouts')}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('management.backToWorkouts')}
      </Button>
      
      {/* Animated Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl p-8 glass-card"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/5 to-pink-500/5" />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Dumbbell className="w-10 h-10 text-primary" />
            </motion.div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">{t('management.title')}</h1>
              <p className="text-muted-foreground mt-1">{t('management.subtitle')}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Badge variant="outline" className="text-sm">
              <TrendingUp className="w-3 h-3 mr-1" />
              {t('management.inProgress')}
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Enhanced Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "plan" | "logbook")}>
        <TabsList className="grid w-full max-w-2xl grid-cols-2 h-auto p-1">
          <TabsTrigger 
            value="plan" 
            className="flex flex-col items-center gap-2 py-4 data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/10 data-[state=active]:to-primary/5"
          >
            <Calendar className="w-5 h-5" />
            <div className="text-center">
              <div className="font-medium">{t('management.tabs.plan')}</div>
              <div className="text-xs text-muted-foreground">{t('management.tabs.planDesc')}</div>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="logbook" 
            className="flex flex-col items-center gap-2 py-4 data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/10 data-[state=active]:to-primary/5"
          >
            <BookOpen className="w-5 h-5" />
            <div className="text-center">
              <div className="font-medium">{t('management.tabs.logbook')}</div>
              <div className="text-xs text-muted-foreground">{t('management.tabs.logbookDesc')}</div>
            </div>
          </TabsTrigger>
        </TabsList>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <TabsContent value="plan" className="mt-6">
            <TrainingPlan />
          </TabsContent>

          <TabsContent value="logbook" className="mt-6">
            <Logbook />
          </TabsContent>
        </motion.div>
      </Tabs>
    </motion.div>
  );
}
