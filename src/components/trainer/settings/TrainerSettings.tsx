import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientAliasesManager } from '../ClientAliasesManager';
import { Settings, UserCog, Bell } from 'lucide-react';
import { NotificationSettings } from './NotificationSettings';
import { useTranslation } from 'react-i18next';

export function TrainerSettings() {
  const { t } = useTranslation('trainer');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
          <p className="text-muted-foreground">{t('settings.subtitle')}</p>
        </div>
      </div>

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            {t('settings.tabs.notifications')}
          </TabsTrigger>
          <TabsTrigger value="aliases" className="gap-2">
            <UserCog className="h-4 w-4" />
            {t('settings.tabs.aliases')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="aliases">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.aliases.title')}</CardTitle>
              <CardDescription>
                {t('settings.aliases.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClientAliasesManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
