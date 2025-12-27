import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BloodTestTrendsChart } from "./BloodTestTrendsChart";
import { ImagingTimeline } from "./ImagingTimeline";
import { DocumentTrends } from "./DocumentTrends";
import { Droplet, Activity, Stethoscope } from "lucide-react";

export const UniversalTrendsView = () => {
  const { t } = useTranslation('medicalDocs');
  const [activeCategory, setActiveCategory] = useState('blood');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold mb-2">{t('universalTrends.title')}</h1>
        <p className="text-muted-foreground">
          {t('universalTrends.subtitle')}
        </p>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="space-y-4">
        <TabsList className="glass-card grid w-full grid-cols-3 h-auto p-1">
          <TabsTrigger value="blood" className="gap-2 data-[state=active]:bg-red-500/20">
            <Droplet className="h-4 w-4" />
            <span className="hidden sm:inline">{t('universalTrends.bloodTests')}</span>
          </TabsTrigger>
          <TabsTrigger value="body" className="gap-2 data-[state=active]:bg-blue-500/20">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">{t('universalTrends.bodyComposition')}</span>
          </TabsTrigger>
          <TabsTrigger value="imaging" className="gap-2 data-[state=active]:bg-purple-500/20">
            <Stethoscope className="h-4 w-4" />
            <span className="hidden sm:inline">{t('universalTrends.imaging')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="blood" className="space-y-4">
          <BloodTestTrendsChart />
        </TabsContent>

        <TabsContent value="body">
          <DocumentTrends />
        </TabsContent>

        <TabsContent value="imaging">
          <ImagingTimeline />
        </TabsContent>
      </Tabs>
    </div>
  );
};
