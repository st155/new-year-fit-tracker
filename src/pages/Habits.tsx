import { useState } from "react";
import { HabitsList } from "@/components/habits/HabitsList";
import { HabitStats } from "@/components/habits/HabitStats";
import { HabitCreateDialog } from "@/components/habits/HabitCreateDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Habits = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Трекер привычек</h1>
          <p className="text-muted-foreground mt-1">
            Стройте здоровые привычки каждый день
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Новая привычка
        </Button>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Мои привычки</TabsTrigger>
          <TabsTrigger value="stats">Статистика</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="space-y-4">
          <HabitsList />
        </TabsContent>
        
        <TabsContent value="stats" className="space-y-4">
          <HabitStats />
        </TabsContent>
      </Tabs>

      <HabitCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
};

export default Habits;
