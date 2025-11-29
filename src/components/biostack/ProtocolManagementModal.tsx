import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Pause, Trash2, Play } from 'lucide-react';
import { useProtocolManagement } from '@/hooks/biostack/useProtocolManagement';
import { ProtocolExpandModal } from './ProtocolExpandModal';
import { EditProtocolModal } from './EditProtocolModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ProtocolManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProtocolManagementModal({ isOpen, onClose }: ProtocolManagementModalProps) {
  const { activeProtocols, isLoading, toggleProtocolMutation, deleteProtocolMutation, logProtocolItemMutation } = useProtocolManagement();
  const [expandedProtocol, setExpandedProtocol] = useState<any>(null);
  const [editingProtocol, setEditingProtocol] = useState<any>(null);
  const [deletingProtocolId, setDeletingProtocolId] = useState<string | null>(null);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-neutral-950 border-green-500/30">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              ⚙️ Manage Protocols
              <Badge variant="outline">{activeProtocols.length}</Badge>
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading protocols...</div>
          ) : activeProtocols.length === 0 ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <span className="text-3xl">📋</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">No active protocols</h3>
                <p className="text-sm text-muted-foreground">
                  Create a protocol to start tracking your supplements
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {activeProtocols.map((protocol) => (
                <Card
                  key={protocol.id}
                  className="p-4 border border-border/50 bg-neutral-900/50 hover:bg-neutral-900 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg">{protocol.name}</h3>
                        <Badge variant={protocol.is_active ? 'default' : 'secondary'} className="text-xs">
                          {protocol.is_active ? '✅ Active' : '⏸️ Paused'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {protocol.protocol_items?.length || 0} supplements
                        </Badge>
                      </div>
                      {protocol.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {protocol.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          Created: {new Date(protocol.created_at).toLocaleDateString()}
                        </span>
                        {protocol.adherence_rate !== null && (
                          <span>
                            Adherence: {protocol.adherence_rate}%
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedProtocol(protocol)}
                        className="border-blue-500/30 hover:bg-blue-500/10"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingProtocol(protocol)}
                        className="border-yellow-500/30 hover:bg-yellow-500/10"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleProtocolMutation.mutate(protocol.id)}
                        disabled={toggleProtocolMutation.isPending}
                        className="border-orange-500/30 hover:bg-orange-500/10"
                      >
                        {protocol.is_active ? (
                          <>
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Resume
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingProtocolId(protocol.id)}
                        className="border-red-500/30 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Protocol Modal */}
      {expandedProtocol && (
        <ProtocolExpandModal
          protocol={expandedProtocol}
          open={!!expandedProtocol}
          onClose={() => setExpandedProtocol(null)}
          onLogItem={(itemId) => logProtocolItemMutation.mutate({ protocolItemId: itemId })}
        />
      )}

      {/* Edit Protocol Modal */}
      {editingProtocol && (
        <EditProtocolModal
          protocol={editingProtocol}
          open={!!editingProtocol}
          onClose={() => setEditingProtocol(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingProtocolId} onOpenChange={(open) => !open && setDeletingProtocolId(null)}>
        <AlertDialogContent className="bg-neutral-950 border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Protocol?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the protocol and all its supplements. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingProtocolId) {
                  deleteProtocolMutation.mutate(deletingProtocolId);
                  setDeletingProtocolId(null);
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
