import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrainerClientCard } from '@/components/trainer/ui';
import { Users, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AddClientToPlanDialog } from './AddClientToPlanDialog';
import { getIntlLocale } from '@/lib/date-locale';

interface AssignedClient {
  id: string;
  client_id: string;
  status: string;
  start_date: string;
  profiles: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface TrainingPlanClientsTabProps {
  planId: string;
  planName: string;
  planDurationWeeks: number;
  assignedClients: AssignedClient[];
  onViewClient: (clientId: string) => void;
  onRefresh: () => void;
}

export function TrainingPlanClientsTab({
  planId,
  planName,
  planDurationWeeks,
  assignedClients,
  onViewClient,
  onRefresh,
}: TrainingPlanClientsTabProps) {
  const { t } = useTranslation('trainingPlan');
  const [showAddClientDialog, setShowAddClientDialog] = useState(false);
  
  const existingClientIds = assignedClients.map((a) => a.client_id);

  return (
    <>
      <div className="space-y-4">
        {/* Header with Add Button */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">
            {t('clients.title', { count: assignedClients.length })}
          </h3>
          <Button onClick={() => setShowAddClientDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('clients.add')}
          </Button>
        </div>

        {(!assignedClients || assignedClients.length === 0) ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">{t('clients.empty')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('clients.emptyDesc')}
              </p>
              <Button onClick={() => setShowAddClientDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('clients.addFirst')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assignedClients.map((assignment) => {
              if (!assignment.profiles) {
                return (
                  <Card key={assignment.id}>
                    <CardContent className="py-6">
                      <p className="text-sm text-muted-foreground">
                        {t('clients.profileNotFound')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ID: {assignment.client_id}
                      </p>
                    </CardContent>
                  </Card>
                );
              }
              
              return (
                <TrainerClientCard
                  key={assignment.id}
                  client={{
                    id: assignment.client_id,
                    username: assignment.profiles.username,
                    full_name: assignment.profiles.full_name,
                    avatar_url: assignment.profiles.avatar_url,
                    goals_count: 0
                  }}
                  healthScore={75}
                  isActive={assignment.status === 'active'}
                  lastActivity={`${t('clients.started')} ${new Date(assignment.start_date).toLocaleDateString(getIntlLocale())}`}
                  onViewDetails={() => onViewClient(assignment.client_id)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Add Client Dialog */}
      <AddClientToPlanDialog
        open={showAddClientDialog}
        onOpenChange={setShowAddClientDialog}
        planId={planId}
        planName={planName}
        planDurationWeeks={planDurationWeeks}
        existingClientIds={existingClientIds}
        onSuccess={() => {
          setShowAddClientDialog(false);
          onRefresh();
        }}
      />
    </>
  );
}
