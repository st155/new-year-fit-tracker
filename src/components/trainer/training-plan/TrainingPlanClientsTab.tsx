import { Card, CardContent } from '@/components/ui/card';
import { TrainerClientCard } from '@/components/trainer/ui';
import { Users } from 'lucide-react';

interface AssignedClient {
  id: string;
  client_id: string;
  status: string;
  start_date: string;
  profiles: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface TrainingPlanClientsTabProps {
  assignedClients: AssignedClient[];
  onViewClient: (clientId: string) => void;
}

export function TrainingPlanClientsTab({
  assignedClients,
  onViewClient,
}: TrainingPlanClientsTabProps) {
  if (!assignedClients || assignedClients.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Нет назначенных клиентов</h3>
          <p className="text-muted-foreground">
            Этот план еще не назначен ни одному клиенту
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {assignedClients.map((assignment) => (
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
          lastActivity={`Начал ${new Date(assignment.start_date).toLocaleDateString('ru-RU')}`}
          onViewDetails={() => onViewClient(assignment.client_id)}
        />
      ))}
    </div>
  );
}
