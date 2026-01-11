import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation('trainerHealth');

  if (loading) {
    return <div>{t('loading')}</div>;
  }

  if (!healthData || healthData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('noHealthData')}
      </div>
    );
  }

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
        <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
        <TabsTrigger value="activity">{t('tabs.activity')}</TabsTrigger>
        <TabsTrigger value="heart">{t('tabs.heart')}</TabsTrigger>
        <TabsTrigger value="sleep">{t('tabs.sleep')}</TabsTrigger>
        <TabsTrigger value="body">{t('tabs.body')}</TabsTrigger>
        <TabsTrigger value="recovery">{t('tabs.recovery')}</TabsTrigger>
        <TabsTrigger value="workouts">{t('tabs.workouts')}</TabsTrigger>
        <TabsTrigger value="health">{t('tabs.metrics')}</TabsTrigger>
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
