import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Pill, 
  Package, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Dumbbell,
  FlaskConical,
  Heart,
  Stethoscope,
} from 'lucide-react';
import { useProtocolGroups, DoctorActionItem, formatScheduleDisplay } from '@/hooks/biostack/useDoctorActionItems';
import { useAddProtocolToLibrary } from '@/hooks/biostack/useDoctorProtocol';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const ACTION_TYPE_CONFIG = {
  supplement: { icon: Pill, label: 'Добавки', color: 'text-green-500' },
  exercise: { icon: Dumbbell, label: 'Упражнения', color: 'text-blue-500' },
  lifestyle: { icon: Heart, label: 'Образ жизни', color: 'text-pink-500' },
  test: { icon: FlaskConical, label: 'Анализы', color: 'text-purple-500' },
  medication: { icon: Pill, label: 'Медикаменты', color: 'text-orange-500' },
  consultation: { icon: Stethoscope, label: 'Консультации', color: 'text-cyan-500' },
};

interface ProtocolCardProps {
  protocol: {
    protocolTag: string;
    doctorName: string | null;
    prescriptionDate: string | null;
    documentId: string;
    items: DoctorActionItem[];
  };
  onAddAll: () => void;
  isAdding: boolean;
}

function ProtocolCard({ protocol, onAddAll, isAdding }: ProtocolCardProps) {
  const supplements = protocol.items.filter(i => i.action_type === 'supplement' || i.action_type === 'medication');
  const pendingSupplements = supplements.filter(s => s.status === 'pending');
  const otherItems = protocol.items.filter(i => i.action_type !== 'supplement' && i.action_type !== 'medication');

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{protocol.protocolTag}</CardTitle>
              {protocol.prescriptionDate && (
                <CardDescription className="text-xs">
                  {format(new Date(protocol.prescriptionDate), 'd MMMM yyyy', { locale: ru })}
                </CardDescription>
              )}
            </div>
          </div>
          {pendingSupplements.length > 0 && (
            <Button 
              size="sm" 
              onClick={onAddAll}
              disabled={isAdding}
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Package className="h-4 w-4 mr-2" />
              )}
              Добавить все ({pendingSupplements.length})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {supplements.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Pill className="h-3 w-3" />
                Добавки и медикаменты ({supplements.length})
              </p>
              <div className="grid gap-2">
                {supplements.map(item => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-background/50"
                  >
                    <div className="flex items-center gap-2">
                      {item.status === 'added_to_library' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : item.status === 'dismissed' ? (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-500" />
                      )}
                      <span className="text-sm font-medium">{item.name}</span>
                      {item.priority === 'high' && (
                        <Badge variant="destructive" className="text-xs">Важно</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {item.dosage} 
                      {item.schedule && ` • ${formatScheduleDisplay(item.schedule)}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {otherItems.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Другие рекомендации ({otherItems.length})
              </p>
              <div className="space-y-2">
                {otherItems.map(item => {
                  const config = ACTION_TYPE_CONFIG[item.action_type as keyof typeof ACTION_TYPE_CONFIG];
                  const Icon = config?.icon || Heart;
                  return (
                    <div 
                      key={item.id} 
                      className="flex items-center gap-2 p-3 rounded-lg bg-background/50"
                    >
                      <Icon className={cn("h-4 w-4", config?.color || 'text-muted-foreground')} />
                      <span className="text-sm font-medium">{item.name}</span>
                      {item.details && (
                        <span className="text-xs text-muted-foreground truncate flex-1">
                          — {item.details}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function DoctorProtocolsSection() {
  const { data: protocols, isLoading } = useProtocolGroups();
  const addProtocol = useAddProtocolToLibrary();
  const [addingProtocolId, setAddingProtocolId] = useState<string | null>(null);

  const handleAddAll = async (protocol: NonNullable<typeof protocols>[0]) => {
    setAddingProtocolId(protocol.documentId);
    try {
      await addProtocol.mutateAsync({ items: protocol.items, addToStack: true });
    } finally {
      setAddingProtocolId(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!protocols || protocols.length === 0) {
    return (
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          Нет протоколов от врачей. Загрузите медицинские документы с назначениями, 
          и система автоматически извлечёт рекомендации.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {protocols.map(protocol => (
        <ProtocolCard 
          key={protocol.documentId}
          protocol={protocol}
          onAddAll={() => handleAddAll(protocol)}
          isAdding={addingProtocolId === protocol.documentId}
        />
      ))}
    </div>
  );
}
