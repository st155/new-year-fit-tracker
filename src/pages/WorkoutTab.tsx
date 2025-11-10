import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dumbbell, BookOpen, Sparkles, Calendar } from "lucide-react";
import Logbook from "@/components/workout/Logbook";
import TrainingPlan from "@/components/workout/TrainingPlan";
import WorkoutToday from "@/components/workout/WorkoutToday";

export default function WorkoutTab() {
  const [activeTab, setActiveTab] = useState<"today" | "plan" | "logbook">("today");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Dumbbell className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold">Workouts</h1>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "today" | "plan" | "logbook")}>
        <TabsList className="grid w-full max-w-3xl grid-cols-3">
          <TabsTrigger value="today" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Сегодня
          </TabsTrigger>
          <TabsTrigger value="plan" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            План
          </TabsTrigger>
          <TabsTrigger value="logbook" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Журнал
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-6">
          <WorkoutToday />
        </TabsContent>

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
