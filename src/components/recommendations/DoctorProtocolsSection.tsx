import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
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
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { useProtocolGroups, DoctorActionItem, formatScheduleDisplay } from '@/hooks/biostack/useDoctorActionItems';
import { useAddProtocolToLibrary } from '@/hooks/biostack/useDoctorProtocol';
import { useExtractProtocols, useToggleProtocolStatus } from '@/hooks/biostack/useExtractProtocols';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const ACTION_TYPE_ICONS = {
  supplement: { icon: Pill, color: 'text-green-500' },
  exercise: { icon: Dumbbell, color: 'text-blue-500' },
  lifestyle: { icon: Heart, color: 'text-pink-500' },
  test: { icon: FlaskConical, color: 'text-purple-500' },
  medication: { icon: Pill, color: 'text-orange-500' },
  consultation: { icon: Stethoscope, color: 'text-cyan-500' },
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
  onNavigate: () => void;
}

function ProtocolCard({ protocol, onAddAll, isAdding, onNavigate }: ProtocolCardProps) {
  const { t, i18n } = useTranslation('recommendations');
  const toggleStatus = useToggleProtocolStatus();
  
  const supplements = protocol.items.filter(i => i.action_type === 'supplement' || i.action_type === 'medication');
  const pendingSupplements = supplements.filter(s => s.status === 'pending');
  const otherItems = protocol.items.filter(i => i.action_type !== 'supplement' && i.action_type !== 'medication');
  
  const isActive = protocol.items.some(item => item.status === 'active' || item.status === 'pending');
  const dateLocale = i18n.language === 'ru' ? ru : enUS;

  const handleToggle = (checked: boolean) => {
    toggleStatus.mutate({ documentId: protocol.documentId, isActive: checked });
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={onNavigate}>
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{protocol.protocolTag}</CardTitle>
              {protocol.prescriptionDate && (
                <CardDescription className="text-xs">
                  {format(new Date(protocol.prescriptionDate), 'd MMMM yyyy', { locale: dateLocale })}
                  {' • '}{protocol.items.length} {t('protocols.items')}
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {isActive ? t('protocols.status.active') : t('protocols.status.inactive')}
              </span>
              <Switch 
                checked={isActive}
                onCheckedChange={handleToggle}
                disabled={toggleStatus.isPending}
              />
            </div>
            {pendingSupplements.length > 0 && (
              <Button 
                size="sm" 
                onClick={(e) => { e.stopPropagation(); onAddAll(); }}
                disabled={isAdding}
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Package className="h-4 w-4 mr-2" />
                )}
                {t('protocols.addAll', { count: pendingSupplements.length })}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onNavigate}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {supplements.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Pill className="h-3 w-3" />
                {t('protocols.supplementsAndMeds', { count: supplements.length })}
              </p>
              <div className="grid gap-2">
                {supplements.slice(0, 3).map(item => (
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
                        <Badge variant="destructive" className="text-xs">{t('protocols.important')}</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {item.dosage} 
                      {item.schedule && ` • ${formatScheduleDisplay(item.schedule)}`}
                    </span>
                  </div>
                ))}
                {supplements.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    {t('protocols.moreItems', { count: supplements.length - 3 })}
                  </p>
                )}
              </div>
            </div>
          )}

          {otherItems.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {t('protocols.otherRecommendations', { count: otherItems.length })}
              </p>
              <div className="space-y-2">
                {otherItems.slice(0, 2).map(item => {
                  const config = ACTION_TYPE_ICONS[item.action_type as keyof typeof ACTION_TYPE_ICONS];
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
                {otherItems.length > 2 && (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    {t('protocols.moreItems', { count: otherItems.length - 2 })}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function DoctorProtocolsSection() {
  const { t } = useTranslation('recommendations');
  const navigate = useNavigate();
  const { data: protocols, isLoading } = useProtocolGroups();
  const addProtocol = useAddProtocolToLibrary();
  const { extractAll, isExtracting, progress } = useExtractProtocols();
  const [addingProtocolId, setAddingProtocolId] = useState<string | null>(null);

  const handleAddAll = async (protocol: NonNullable<typeof protocols>[0]) => {
    setAddingProtocolId(protocol.documentId);
    try {
      await addProtocol.mutateAsync({ items: protocol.items, addToStack: true });
    } finally {
      setAddingProtocolId(null);
    }
  };

  const handleNavigateToProtocol = (documentId: string) => {
    navigate(`/recommendations/protocol/${documentId}`);
  };

  return (
    <div className="space-y-4">
      {/* Extract All Button */}
      <Card className="glass-card border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-medium">{t('protocols.extract.title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('protocols.extract.description')}
              </p>
            </div>
            <Button 
              onClick={() => extractAll()}
              disabled={isExtracting}
              variant="outline"
            >
              {isExtracting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {isExtracting ? t('protocols.extract.extracting') : t('protocols.extract.button')}
            </Button>
          </div>
          {progress && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{t('protocols.extract.progress')}</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <Progress value={(progress.current / progress.total) * 100} />
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ) : !protocols || protocols.length === 0 ? (
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            {t('protocols.empty.title')}
          </AlertDescription>
        </Alert>
      ) : (
        protocols.map(protocol => (
          <ProtocolCard 
            key={protocol.documentId}
            protocol={protocol}
            onAddAll={() => handleAddAll(protocol)}
            isAdding={addingProtocolId === protocol.documentId}
            onNavigate={() => handleNavigateToProtocol(protocol.documentId)}
          />
        ))
      )}
    </div>
  );
}
