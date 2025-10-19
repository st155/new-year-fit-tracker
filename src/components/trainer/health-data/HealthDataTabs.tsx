import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HealthData } from "./types";
import { HealthOverview } from "./HealthOverview";
import { ActivityMetrics } from "./ActivityMetrics";
import { HeartMetrics } from "./HeartMetrics";
import { SleepMetrics } from "./SleepMetrics";
import { BodyMetrics } from "./BodyMetrics";
import { RecoveryMetrics } from "./RecoveryMetrics";
import { WorkoutMetrics } from "./WorkoutMetrics";
import { HealthMetricsTab } from "./HealthMetricsTab";

interface HealthDataTabsProps {
  healthData: HealthData[];
  loading?: boolean;
}

export function HealthDataTabs({ healthData, loading }: HealthDataTabsProps) {
  if (loading) {
    return <div>Загрузка данных...</div>;
  }

  if (!healthData || healthData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Нет данных о здоровье
      </div>
    );
  }

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
        <TabsTrigger value="overview">Обзор</TabsTrigger>
        <TabsTrigger value="activity">Активность</TabsTrigger>
        <TabsTrigger value="heart">Сердце</TabsTrigger>
        <TabsTrigger value="sleep">Сон</TabsTrigger>
        <TabsTrigger value="body">Тело</TabsTrigger>
        <TabsTrigger value="recovery">Восстановление</TabsTrigger>
        <TabsTrigger value="workouts">Тренировки</TabsTrigger>
        <TabsTrigger value="health">Метрики</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <HealthOverview healthData={healthData} />
      </TabsContent>

      <TabsContent value="activity">
        <ActivityMetrics healthData={healthData} />
      </TabsContent>

      <TabsContent value="heart">
        <HeartMetrics healthData={healthData} />
      </TabsContent>

      <TabsContent value="sleep">
        <SleepMetrics healthData={healthData} />
      </TabsContent>

      <TabsContent value="body">
        <BodyMetrics healthData={healthData} />
      </TabsContent>

      <TabsContent value="recovery">
        <RecoveryMetrics healthData={healthData} />
      </TabsContent>

      <TabsContent value="workouts">
        <WorkoutMetrics healthData={healthData} />
      </TabsContent>

      <TabsContent value="health">
        <HealthMetricsTab healthData={healthData} />
      </TabsContent>
    </Tabs>
  );
}
