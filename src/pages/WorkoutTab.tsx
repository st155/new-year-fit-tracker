import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dumbbell, BookOpen } from "lucide-react";
import Logbook from "@/components/workout/Logbook";
import TrainingPlan from "@/components/workout/TrainingPlan";

export default function WorkoutTab() {
  const [activeTab, setActiveTab] = useState<"plan" | "logbook">("plan");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Dumbbell className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold">Workouts</h1>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "plan" | "logbook")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="plan" className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4" />
            Training Plan
          </TabsTrigger>
          <TabsTrigger value="logbook" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Logbook
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
