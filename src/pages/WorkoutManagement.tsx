import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dumbbell, BookOpen, Calendar, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Logbook from "@/components/workout/Logbook";
import TrainingPlan from "@/components/workout/TrainingPlan";

export default function WorkoutManagement() {
  const [activeTab, setActiveTab] = useState<"plan" | "logbook">("plan");
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button 
        variant="ghost" 
        onClick={() => navigate('/workouts')}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Назад к тренировкам
      </Button>
      
      <div className="flex items-center gap-3 mb-6">
        <Dumbbell className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold">Планы и История</h1>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "plan" | "logbook")}>
        <TabsList className="grid w-full max-w-2xl grid-cols-2">
          <TabsTrigger value="plan" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            План
          </TabsTrigger>
          <TabsTrigger value="logbook" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Журнал
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="mt-6">
          <TrainingPlan />
        </TabsContent>

        <TabsContent value="logbook" className="mt-6">
          <Logbook />
        </TabsContent>
      </Tabs>
    </div>
  );
}
