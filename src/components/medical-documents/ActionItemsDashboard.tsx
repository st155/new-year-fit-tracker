import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Pill, 
  Dumbbell, 
  Heart, 
  FlaskConical, 
  Stethoscope, 
  Calendar,
  Plus,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  FileText,
  Loader2,
} from 'lucide-react';
import { 
  useGroupedActionItems, 
  useProtocolGroups,
  DoctorActionItem,
  formatScheduleDisplay,
  useDismissActionItem,
} from '@/hooks/biostack/useDoctorActionItems';
import { useAddSupplementToLibrary, useAddProtocolToLibrary } from '@/hooks/biostack/useDoctorProtocol';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const ACTION_TYPE_CONFIG = {
  supplement: { icon: Pill, label: 'Добавки', color: 'text-green-500' },
  exercise: { icon: Dumbbell, label: 'Упражнения', color: 'text-blue-500' },
  lifestyle: { icon: Heart, label: 'Образ жизни', color: 'text-pink-500' },
  test: { icon: FlaskConical, label: 'Анализы', color: 'text-purple-500' },
  medication: { icon: Pill, label: 'Медикаменты', color: 'text-orange-500' },
  consultation: { icon: Stethoscope, label: 'Консультации', color: 'text-cyan-500' },
};

const STATUS_CONFIG = {
  pending: { label: 'Ожидает', color: 'bg-yellow-500/20 text-yellow-500' },
  active: { label: 'Активно', color: 'bg-green-500/20 text-green-500' },
  completed: { label: 'Выполнено', color: 'bg-blue-500/20 text-blue-500' },
  dismissed: { label: 'Отклонено', color: 'bg-muted text-muted-foreground' },
  added_to_library: { label: 'В библиотеке', color: 'bg-primary/20 text-primary' },
};

function ActionItemCard({ 
  item,
  onAddToLibrary,
  onDismiss,
  isAdding,
}: { 
  item: DoctorActionItem;
  onAddToLibrary?: (item: DoctorActionItem) => void;
  onDismiss?: (itemId: string) => void;
  isAdding?: boolean;
}) {
  const config = ACTION_TYPE_CONFIG[item.action_type];
  const Icon = config.icon;
  const statusConfig = STATUS_CONFIG[item.status];

  return (
    <Card className="glass-card hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-2 rounded-lg bg-background/50 ${config.color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium truncate">{item.name}</h4>
                <Badge variant="outline" className={statusConfig.color}>
                  {statusConfig.label}
                </Badge>
                {item.priority === 'high' && (
                  <Badge variant="destructive" className="text-xs">Важно</Badge>
                )}
              </div>
              
              <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                {item.dosage && (
                  <p className="flex items-center gap-1">
                    <Pill className="h-3 w-3" />
                    {item.dosage}
                    {item.schedule && ` • ${formatScheduleDisplay(item.schedule)}`}
                  </p>
                )}
                {item.frequency && !item.schedule && (
                  <p className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {item.frequency}
                  </p>
                )}
                {item.duration && (
                  <p className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {item.duration}
                  </p>
                )}
                {item.rationale && (
                  <p className="text-xs text-muted-foreground/80 line-clamp-2">
                    {item.rationale}
                  </p>
                )}
              </div>

              {item.doctor_name && (
                <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {item.doctor_name}
                  {item.prescription_date && (
                    <span> • {format(new Date(item.prescription_date), 'd MMM yyyy', { locale: ru })}</span>
                  )}
                </p>
              )}
            </div>
          </div>

          {item.status === 'pending' && item.action_type === 'supplement' && onAddToLibrary && (
            <div className="flex flex-col gap-1">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onAddToLibrary(item)}
                disabled={isAdding}
                className="text-xs"
              >
                {isAdding ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-3 w-3 mr-1" />
                    В библиотеку
                  </>
                )}
              </Button>
              {onDismiss && (
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => onDismiss(item.id)}
                  className="text-xs text-muted-foreground"
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Отклонить
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProtocolCard({ 
  protocol,
  onAddAllToLibrary,
  isAdding,
}: { 
  protocol: ReturnType<typeof useProtocolGroups>['data'][0];
  onAddAllToLibrary: () => void;
  isAdding: boolean;
}) {
  const supplements = protocol.items.filter(i => i.action_type === 'supplement');
  const pendingSupplements = supplements.filter(s => s.status === 'pending');
  const otherItems = protocol.items.filter(i => i.action_type !== 'supplement');

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
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
              onClick={onAddAllToLibrary}
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
        <div className="space-y-2">
          {supplements.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Pill className="h-3 w-3" />
                Добавки ({supplements.length})
              </p>
              <div className="grid gap-2">
                {supplements.map(item => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-2 rounded-lg bg-background/50"
                  >
                    <div className="flex items-center gap-2">
                      {item.status === 'added_to_library' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : item.status === 'dismissed' ? (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-500" />
                      )}
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {item.dosage} {item.schedule && `• ${formatScheduleDisplay(item.schedule)}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {otherItems.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Другие рекомендации ({otherItems.length})
              </p>
              <div className="space-y-1">
                {otherItems.map(item => {
                  const config = ACTION_TYPE_CONFIG[item.action_type];
                  const Icon = config.icon;
                  return (
                    <div 
                      key={item.id} 
                      className="flex items-center gap-2 p-2 rounded-lg bg-background/50"
                    >
                      <Icon className={`h-3 w-3 ${config.color}`} />
                      <span className="text-sm">{item.name}</span>
                      {item.details && (
                        <span className="text-xs text-muted-foreground truncate">
                          {item.details}
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

export function ActionItemsDashboard() {
  const [activeTab, setActiveTab] = useState('protocols');
  const { data: grouped, items, isLoading } = useGroupedActionItems();
  const { data: protocols } = useProtocolGroups();
  const addToLibrary = useAddSupplementToLibrary();
  const addProtocol = useAddProtocolToLibrary();
  const dismissItem = useDismissActionItem();
  const [addingItemId, setAddingItemId] = useState<string | null>(null);
  const [addingProtocolId, setAddingProtocolId] = useState<string | null>(null);

  const handleAddToLibrary = async (item: DoctorActionItem) => {
    setAddingItemId(item.id);
    try {
      await addToLibrary.mutateAsync({ item, addToStack: true });
    } finally {
      setAddingItemId(null);
    }
  };

  const handleAddProtocolToLibrary = async (protocol: ReturnType<typeof useProtocolGroups>['data'][0]) => {
    setAddingProtocolId(protocol.documentId);
    try {
      await addProtocol.mutateAsync({ items: protocol.items, addToStack: true });
    } finally {
      setAddingProtocolId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          Нет извлечённых рекомендаций. Загрузите медицинские документы с назначениями врача, 
          и система автоматически извлечёт рекомендации по добавкам, упражнениям и анализам.
        </AlertDescription>
      </Alert>
    );
  }

  const counts = {
    supplements: grouped.supplements.length,
    exercises: grouped.exercises.length,
    lifestyle: grouped.lifestyle.length,
    tests: grouped.tests.length,
    medications: grouped.medications.length,
    consultations: grouped.consultations.length,
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {Object.entries(counts).map(([type, count]) => {
          const config = ACTION_TYPE_CONFIG[type as keyof typeof ACTION_TYPE_CONFIG];
          const Icon = config.icon;
          return (
            <Card key={type} className="glass-card p-3">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${config.color}`} />
                <div>
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="glass-card grid w-full grid-cols-4 h-auto p-1">
          <TabsTrigger value="protocols" className="gap-2 data-[state=active]:bg-primary/20">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Протоколы</span>
          </TabsTrigger>
          <TabsTrigger value="supplements" className="gap-2 data-[state=active]:bg-primary/20">
            <Pill className="h-4 w-4" />
            <span className="hidden sm:inline">Добавки</span>
            {counts.supplements > 0 && (
              <Badge variant="secondary" className="ml-1">{counts.supplements}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="exercises" className="gap-2 data-[state=active]:bg-primary/20">
            <Dumbbell className="h-4 w-4" />
            <span className="hidden sm:inline">Упражнения</span>
          </TabsTrigger>
          <TabsTrigger value="tests" className="gap-2 data-[state=active]:bg-primary/20">
            <FlaskConical className="h-4 w-4" />
            <span className="hidden sm:inline">Анализы</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="protocols" className="mt-4 space-y-4">
          {protocols && protocols.length > 0 ? (
            protocols.map(protocol => (
              <ProtocolCard 
                key={protocol.documentId}
                protocol={protocol}
                onAddAllToLibrary={() => handleAddProtocolToLibrary(protocol)}
                isAdding={addingProtocolId === protocol.documentId}
              />
            ))
          ) : (
            <Alert>
              <AlertDescription>Нет протоколов от врачей.</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="supplements" className="mt-4 space-y-3">
          {grouped.supplements.length > 0 ? (
            grouped.supplements.map(item => (
              <ActionItemCard 
                key={item.id}
                item={item}
                onAddToLibrary={handleAddToLibrary}
                onDismiss={(id) => dismissItem.mutate(id)}
                isAdding={addingItemId === item.id}
              />
            ))
          ) : (
            <Alert>
              <AlertDescription>Нет рекомендаций по добавкам.</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="exercises" className="mt-4 space-y-3">
          {grouped.exercises.length > 0 ? (
            grouped.exercises.map(item => (
              <ActionItemCard key={item.id} item={item} />
            ))
          ) : (
            <Alert>
              <AlertDescription>Нет рекомендаций по упражнениям.</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="tests" className="mt-4 space-y-3">
          {[...grouped.tests, ...grouped.consultations].length > 0 ? (
            [...grouped.tests, ...grouped.consultations].map(item => (
              <ActionItemCard key={item.id} item={item} />
            ))
          ) : (
            <Alert>
              <AlertDescription>Нет рекомендаций по анализам и консультациям.</AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
