import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Edit, Trash2, Eye, Calendar, Users } from 'lucide-react';
import { useIsMobile } from '@/hooks/primitive';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ProtocolExpandModal } from './ProtocolExpandModal';
import { EditProtocolModal } from './EditProtocolModal';
import { useProtocolManagementQuery } from '@/features/biostack/hooks/queries/useProtocolsQuery';
import { useProtocolMutations } from '@/features/biostack/hooks/mutations/useProtocolMutations';
import { useLogsMutations } from '@/features/biostack/hooks/mutations/useLogsMutations';

interface ProtocolManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProtocolManagementModal({ isOpen, onClose }: ProtocolManagementModalProps) {
  const isMobile = useIsMobile();
  const [expandedProtocol, setExpandedProtocol] = useState<any>(null);
  const [editingProtocol, setEditingProtocol] = useState<any>(null);
  const [deletingProtocolId, setDeletingProtocolId] = useState<string | null>(null);

  const { data: activeProtocols = [], isLoading } = useProtocolManagementQuery();
  const { toggleProtocol, deleteProtocol } = useProtocolMutations();
  const { logIntakeForStackItem } = useLogsMutations();

  const handleToggleActive = (protocolId: string) => {
    const protocol = activeProtocols.find((p: any) => p.id === protocolId);
    if (protocol) {
      toggleProtocol.mutate({ protocolId, currentStatus: protocol.is_active });
    }
  };

  const handleDeleteProtocol = (protocolId: string) => {
    deleteProtocol.mutate(protocolId);
    setDeletingProtocolId(null);
  };

  const handleLogItem = (itemId: string) => {
    logIntakeForStackItem.mutate({ stackItemId: itemId });
  };

  const content = (
    <div className="space-y-4 py-4">
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading protocols...
        </div>
      ) : activeProtocols.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No protocols found. Create one to get started.
        </div>
      ) : (
        activeProtocols.map((protocol: any) => (
          <Card key={protocol.id} className="p-4 border border-border/50 bg-neutral-900/50">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground truncate">
                    {protocol.name}
                  </h3>
                  <Badge 
                    variant={protocol.is_active ? "default" : "secondary"}
                    className={protocol.is_active ? "bg-green-500" : ""}
                  >
                    {protocol.is_active ? 'Active' : 'Paused'}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {protocol.protocol_items?.length || 0} supplements
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(protocol.created_at).toLocaleDateString()}
                  </span>
                </div>

                {protocol.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {protocol.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={protocol.is_active}
                  onCheckedChange={() => handleToggleActive(protocol.id)}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/30">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandedProtocol(protocol)}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-2" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingProtocol(protocol)}
                className="border-yellow-500/30 hover:bg-yellow-500/10"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <AlertDialog 
                open={deletingProtocolId === protocol.id} 
                onOpenChange={(open) => !open && setDeletingProtocolId(null)}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeletingProtocolId(protocol.id)}
                    className="border-red-500/30 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-neutral-950 border-neutral-800">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Protocol?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{protocol.name}" and all associated data.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-neutral-700">Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleDeleteProtocol(protocol.id)}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </Card>
        ))
      )}
    </div>
  );

  // Adaptive rendering: Drawer on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <>
        <Drawer open={isOpen} onOpenChange={onClose}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader>
              <DrawerTitle>Manage Protocols</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4 overflow-y-auto">
              {content}
            </div>
          </DrawerContent>
        </Drawer>

        {expandedProtocol && (
          <ProtocolExpandModal
            protocol={expandedProtocol}
            open={!!expandedProtocol}
            onClose={() => setExpandedProtocol(null)}
            onLogItem={handleLogItem}
          />
        )}

        {editingProtocol && (
          <EditProtocolModal
            protocol={editingProtocol}
            open={!!editingProtocol}
            onClose={() => setEditingProtocol(null)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-neutral-950 border-green-500/30">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Manage Protocols</DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>

      {expandedProtocol && (
        <ProtocolExpandModal
          protocol={expandedProtocol}
          open={!!expandedProtocol}
          onClose={() => setExpandedProtocol(null)}
          onLogItem={handleLogItem}
        />
      )}

      {editingProtocol && (
        <EditProtocolModal
          protocol={editingProtocol}
          open={!!editingProtocol}
          onClose={() => setEditingProtocol(null)}
        />
      )}
    </>
  );
}
