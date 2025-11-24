import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSupplementProtocol } from "@/hooks/supplements/useSupplementProtocol";
import { useAuth } from "@/hooks/useAuth";
import { Eye, Power, Trash2, Sparkles, Calendar, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProtocolProgress {
  daysPassed: number;
  daysTotal: number;
  progressPercent: number;
}

const INTAKE_TIME_LABELS: Record<string, string> = {
  morning: '🌅 Утро',
  afternoon: '☀️ Обед',
  evening: '🌆 Ужин',
  before_sleep: '🌙 Перед сном'
};

export function ProtocolHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    activeProtocol, 
    protocolHistory, 
    isLoading,
    activateProtocol,
    deleteProtocol 
  } = useSupplementProtocol(user?.id);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [protocolToDelete, setProtocolToDelete] = useState<string | null>(null);

  const getProtocolProgress = (protocol: any): ProtocolProgress | null => {
    if (!protocol.created_at || !protocol.duration_days) return null;
    
    const startDate = new Date(protocol.created_at);
    const now = new Date();
    const daysPassed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const progressPercent = Math.min((daysPassed / protocol.duration_days) * 100, 100);
    
    return {
      daysPassed,
      daysTotal: protocol.duration_days,
      progressPercent: Math.round(progressPercent)
    };
  };

  const handleViewDetails = (protocol: any) => {
    setSelectedProtocol(protocol);
    setViewDialogOpen(true);
  };

  const handleActivate = async (protocolId: string) => {
    try {
      await activateProtocol.mutateAsync(protocolId);
    } catch (error) {
      toast({
        title: "Ошибка активации",
        description: error instanceof Error ? error.message : "Попробуйте еще раз",
        variant: "destructive"
      });
    }
  };

  const handleDeleteClick = (protocolId: string) => {
    setProtocolToDelete(protocolId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!protocolToDelete) return;
    
    try {
      await deleteProtocol.mutateAsync(protocolToDelete);
      setDeleteDialogOpen(false);
      setProtocolToDelete(null);
    } catch (error) {
      toast({
        title: "Ошибка удаления",
        description: error instanceof Error ? error.message : "Попробуйте еще раз",
        variant: "destructive"
      });
    }
  };

  const renderProtocolCard = (protocol: any, isActive: boolean) => {
    const progress = getProtocolProgress(protocol);
    const itemsCount = protocol.protocol_items?.length || 0;

    return (
      <Card 
        key={protocol.id} 
        className={`p-6 space-y-4 ${isActive ? 'border-primary bg-primary/5' : ''}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-semibold">{protocol.name}</h3>
              {isActive && (
                <Badge variant="default" className="gap-1">
                  <Power className="h-3 w-3" />
                  Активен
                </Badge>
              )}
              {protocol.ai_generated && (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI Generated
                </Badge>
              )}
            </div>

            {protocol.description && (
              <p className="text-sm text-muted-foreground">{protocol.description}</p>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                {itemsCount} {itemsCount === 1 ? 'добавка' : 'добавок'}
              </div>
              {protocol.duration_days && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {protocol.duration_days} {protocol.duration_days === 1 ? 'день' : 'дней'}
                </div>
              )}
              <div>
                Создан {new Date(protocol.created_at).toLocaleDateString('ru-RU')}
              </div>
            </div>

            {progress && isActive && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Прогресс</span>
                  <span className="font-medium">
                    {progress.daysPassed} / {progress.daysTotal} дней ({progress.progressPercent}%)
                  </span>
                </div>
                <Progress value={progress.progressPercent} className="h-2" />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleViewDetails(protocol)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Просмотр
          </Button>

          {!isActive && (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={() => handleActivate(protocol.id)}
                disabled={activateProtocol.isPending}
              >
                <Power className="h-4 w-4 mr-2" />
                Активировать
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeleteClick(protocol.id)}
                disabled={deleteProtocol.isPending}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
        </div>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-muted-foreground">Загрузка протоколов...</p>
        </div>
      </div>
    );
  }

  const inactiveProtocols = protocolHistory?.filter((p: any) => !p.is_active) || [];

  return (
    <div className="space-y-8">
      {/* Active Protocol Section */}
      {activeProtocol && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
            Активный протокол
          </h2>
          {renderProtocolCard(activeProtocol, true)}
        </div>
      )}

      {/* History Section */}
      {inactiveProtocols.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">
            📚 История протоколов ({inactiveProtocols.length})
          </h2>
          <div className="space-y-4">
            {inactiveProtocols.map((protocol: any) => renderProtocolCard(protocol, false))}
          </div>
        </div>
      )}

      {!activeProtocol && inactiveProtocols.length === 0 && (
        <div className="text-center py-12 space-y-2">
          <Package className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground">Протоколы не найдены</p>
          <p className="text-sm text-muted-foreground">
            Создайте свой первый протокол во вкладке "Import Protocol"
          </p>
        </div>
      )}

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedProtocol?.name}
              {selectedProtocol?.ai_generated && (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI
                </Badge>
              )}
            </DialogTitle>
            {selectedProtocol?.description && (
              <DialogDescription>{selectedProtocol.description}</DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4">
            {selectedProtocol?.protocol_items?.map((item: any, index: number) => (
              <Card key={index} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-lg">
                      {item.supplement_products?.name || 'Unknown Supplement'}
                    </h4>
                    {item.supplement_products?.brand && (
                      <p className="text-sm text-muted-foreground">
                        {item.supplement_products.brand}
                      </p>
                    )}
                  </div>
                  {item.supplement_products?.product_image_url && (
                    <img 
                      src={item.supplement_products.product_image_url} 
                      alt={item.supplement_products.name}
                      className="h-16 w-16 object-cover rounded-lg"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Дозировка:</span>
                    <p className="font-medium">
                      {item.daily_dosage} {item.dosage_unit}
                    </p>
                  </div>
                  {item.supplement_products?.form && (
                    <div>
                      <span className="text-muted-foreground">Форма:</span>
                      <p className="font-medium capitalize">
                        {item.supplement_products.form}
                      </p>
                    </div>
                  )}
                </div>

                {item.intake_times && item.intake_times.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Время приема:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {item.intake_times.map((time: string) => (
                        <Badge key={time} variant="outline">
                          {INTAKE_TIME_LABELS[time] || time}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {item.notes && (
                  <div className="p-2 bg-muted/30 rounded text-sm">
                    📝 {item.notes}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить протокол?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Протокол и все его данные будут удалены навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
