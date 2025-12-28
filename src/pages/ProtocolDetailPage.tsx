import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Pill, 
  Dumbbell, 
  Heart, 
  FlaskConical, 
  Stethoscope,
  Pencil,
  Trash2,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DoctorActionItem, formatScheduleDisplay } from '@/hooks/biostack/useDoctorActionItems';
import { useUpdateActionItem, useDeleteActionItem, useToggleProtocolStatus } from '@/hooks/biostack/useExtractProtocols';
import { useAddProtocolToLibrary } from '@/hooks/biostack/useDoctorProtocol';

const ACTION_TYPE_CONFIG = {
  supplement: { icon: Pill, labelKey: 'protocol.actionType.supplement', color: 'text-green-500' },
  exercise: { icon: Dumbbell, labelKey: 'protocol.actionType.exercise', color: 'text-blue-500' },
  lifestyle: { icon: Heart, labelKey: 'protocol.actionType.lifestyle', color: 'text-pink-500' },
  test: { icon: FlaskConical, labelKey: 'protocol.actionType.test', color: 'text-purple-500' },
  medication: { icon: Pill, labelKey: 'protocol.actionType.medication', color: 'text-orange-500' },
  consultation: { icon: Stethoscope, labelKey: 'protocol.actionType.consultation', color: 'text-cyan-500' },
};

const STATUS_CONFIG = {
  pending: { labelKey: 'protocol.status.pending', icon: Clock, color: 'text-yellow-500' },
  active: { labelKey: 'protocol.status.active', icon: CheckCircle2, color: 'text-green-500' },
  completed: { labelKey: 'protocol.status.completed', icon: CheckCircle2, color: 'text-blue-500' },
  dismissed: { labelKey: 'protocol.status.dismissed', icon: XCircle, color: 'text-muted-foreground' },
  added_to_library: { labelKey: 'protocol.status.addedToLibrary', icon: CheckCircle2, color: 'text-primary' },
};

interface EditItemDialogProps {
  item: DoctorActionItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EditItemDialog({ item, open, onOpenChange }: EditItemDialogProps) {
  const { t } = useTranslation('medicalDocs');
  const [dosage, setDosage] = useState(item.dosage || '');
  const [schedule, setSchedule] = useState(item.schedule || '');
  const [frequency, setFrequency] = useState(item.frequency || '');
  const [details, setDetails] = useState(item.details || '');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>(item.priority);
  
  const updateItem = useUpdateActionItem();

  const handleSave = () => {
    updateItem.mutate({
      itemId: item.id,
      updates: { dosage, schedule, frequency, details, priority }
    }, {
      onSuccess: () => onOpenChange(false)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('protocol.editItem', { name: item.name })}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t('protocol.dosage')}</Label>
            <Input 
              value={dosage} 
              onChange={(e) => setDosage(e.target.value)} 
              placeholder={t('protocol.dosagePlaceholder')}
            />
          </div>
          <div>
            <Label>{t('protocol.schedule')}</Label>
            <Input 
              value={schedule} 
              onChange={(e) => setSchedule(e.target.value)} 
              placeholder={t('protocol.schedulePlaceholder')}
            />
          </div>
          <div>
            <Label>{t('protocol.frequency')}</Label>
            <Input 
              value={frequency} 
              onChange={(e) => setFrequency(e.target.value)} 
              placeholder={t('protocol.frequencyPlaceholder')}
            />
          </div>
          <div>
            <Label>{t('protocol.priority')}</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">{t('protocol.priorityHigh')}</SelectItem>
                <SelectItem value="medium">{t('protocol.priorityMedium')}</SelectItem>
                <SelectItem value="low">{t('protocol.priorityLow')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('protocol.details')}</Label>
            <Textarea 
              value={details} 
              onChange={(e) => setDetails(e.target.value)} 
              placeholder={t('protocol.detailsPlaceholder')}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('dialog.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={updateItem.isPending}>
              {updateItem.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('protocol.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ActionItemRowProps {
  item: DoctorActionItem;
}

function ActionItemRow({ item }: ActionItemRowProps) {
  const { t } = useTranslation('medicalDocs');
  const [editOpen, setEditOpen] = useState(false);
  const deleteItem = useDeleteActionItem();
  const addToLibrary = useAddProtocolToLibrary();
  
  const config = ACTION_TYPE_CONFIG[item.action_type as keyof typeof ACTION_TYPE_CONFIG];
  const statusConfig = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG];
  const Icon = config?.icon || Heart;
  const StatusIcon = statusConfig?.icon || Clock;

  const handleAddToLibrary = () => {
    addToLibrary.mutate({ items: [item], addToStack: true });
  };

  return (
    <>
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className={cn("p-2 rounded-lg bg-background/50", config?.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{item.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {config ? t(config.labelKey) : item.action_type}
                  </Badge>
                  {item.priority === 'high' && (
                    <Badge variant="destructive" className="text-xs">{t('protocol.important')}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <StatusIcon className={cn("h-3 w-3", statusConfig?.color)} />
                  <span>{statusConfig ? t(statusConfig.labelKey) : item.status}</span>
                </div>
                {(item.dosage || item.schedule) && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.dosage}
                    {item.schedule && ` • ${formatScheduleDisplay(item.schedule)}`}
                  </p>
                )}
                {item.details && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {item.details}
                  </p>
                )}
                {item.rationale && (
                  <p className="text-xs text-muted-foreground/70 mt-1 italic">
                    {item.rationale}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {(item.action_type === 'supplement' || item.action_type === 'medication') && 
               item.status !== 'added_to_library' && (
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={handleAddToLibrary}
                  disabled={addToLibrary.isPending}
                >
                  {addToLibrary.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => deleteItem.mutate(item.id)}
                disabled={deleteItem.isPending}
              >
                {deleteItem.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 text-destructive" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <EditItemDialog item={item} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}

export default function ProtocolDetailPage() {
  const { t, i18n } = useTranslation('medicalDocs');
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const toggleStatus = useToggleProtocolStatus();
  const addToLibrary = useAddProtocolToLibrary();

  const dateLocale = i18n.language === 'ru' ? ru : enUS;

  const { data: protocol, isLoading } = useQuery({
    queryKey: ['protocol-detail', documentId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('doctor_action_items')
        .select('*')
        .eq('document_id', documentId)
        .eq('user_id', user.id)
        .order('action_type', { ascending: true });

      if (error) throw error;
      return data as DoctorActionItem[];
    },
    enabled: !!documentId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!protocol || protocol.length === 0) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('protocol.back')}
        </Button>
        <Card className="glass-card">
          <CardContent className="p-8 text-center text-muted-foreground">
            {t('protocol.notFound')}
          </CardContent>
        </Card>
      </div>
    );
  }

  const firstItem = protocol[0];
  const protocolTag = firstItem.protocol_tag || t('protocol.document', { id: documentId?.substring(0, 8) });
  const isActive = protocol.some(item => item.status === 'active' || item.status === 'pending');
  const supplements = protocol.filter(i => i.action_type === 'supplement' || i.action_type === 'medication');
  const pendingSupplements = supplements.filter(s => s.status !== 'added_to_library');

  const handleToggleStatus = () => {
    if (documentId) {
      toggleStatus.mutate({ documentId, isActive: !isActive });
    }
  };

  const handleAddAllSupplements = () => {
    if (pendingSupplements.length > 0) {
      addToLibrary.mutate({ items: pendingSupplements, addToStack: true });
    }
  };

  // Group by action type
  const grouped = protocol.reduce((acc, item) => {
    const type = item.action_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {} as Record<string, DoctorActionItem[]>);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('protocol.back')}
        </Button>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>{protocolTag}</CardTitle>
              <CardDescription>
                {firstItem.doctor_name && `${t('protocol.doctor', { name: firstItem.doctor_name })} • `}
                {firstItem.prescription_date && format(new Date(firstItem.prescription_date), 'd MMMM yyyy', { locale: dateLocale })}
                {' • '}{t('protocol.items', { count: protocol.length })}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {pendingSupplements.length > 0 && (
                <Button 
                  onClick={handleAddAllSupplements}
                  disabled={addToLibrary.isPending}
                >
                  {addToLibrary.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {t('protocol.addAllSupplements', { count: pendingSupplements.length })}
                </Button>
              )}
              <Button 
                variant={isActive ? "destructive" : "default"}
                onClick={handleToggleStatus}
                disabled={toggleStatus.isPending}
              >
                {toggleStatus.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : isActive ? (
                  <XCircle className="h-4 w-4 mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                {isActive ? t('protocol.deactivate') : t('protocol.activate')}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {Object.entries(grouped).map(([type, items]) => {
        const config = ACTION_TYPE_CONFIG[type as keyof typeof ACTION_TYPE_CONFIG];
        return (
          <div key={type} className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {config && <config.icon className={cn("h-4 w-4", config.color)} />}
              {config ? t(config.labelKey) : type} ({items.length})
            </h3>
            <div className="space-y-2">
              {items.map(item => (
                <ActionItemRow key={item.id} item={item} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
