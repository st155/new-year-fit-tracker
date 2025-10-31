import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientAliasesManager } from '../ClientAliasesManager';
import { Settings, UserCog } from 'lucide-react';

export function TrainerSettings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your trainer account settings</p>
        </div>
      </div>

      <Tabs defaultValue="aliases" className="space-y-6">
        <TabsList>
          <TabsTrigger value="aliases" className="gap-2">
            <UserCog className="h-4 w-4" />
            Client Aliases
          </TabsTrigger>
        </TabsList>

        <TabsContent value="aliases">
          <Card>
            <CardHeader>
              <CardTitle>Client Aliases</CardTitle>
              <CardDescription>
                Set custom names for your clients to use with AI assistant
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
