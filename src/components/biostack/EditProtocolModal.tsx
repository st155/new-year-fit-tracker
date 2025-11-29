import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { EditProtocolItemDialog } from './EditProtocolItemDialog';

interface EditProtocolModalProps {
  protocol: any;
  open: boolean;
  onClose: () => void;
}

export function EditProtocolModal({ protocol, open, onClose }: EditProtocolModalProps) {
  const [name, setName] = useState(protocol.name);
  const [description, setDescription] = useState(protocol.description || '');
  const [editingItem, setEditingItem] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateProtocolMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('protocols')
        .update({ name, description })
        .eq('id', protocol.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-protocols'] });
      toast({
        title: '✅ Protocol updated',
        description: 'Protocol information has been saved.',
      });
      onClose();
    },
    onError: (error) => {
      console.error('Update protocol error:', error);
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Failed to update protocol',
        variant: 'destructive',
      });
    },
  });

  const deleteProtocolItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      // Delete supplement_logs first
      await supabase
        .from('supplement_logs')
        .delete()
        .eq('protocol_item_id', itemId);

      // Then delete protocol_item
      const { error } = await supabase
        .from('protocol_items')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-protocols'] });
      toast({
        title: '✅ Item removed',
        description: 'Supplement removed from protocol.',
      });
    },
    onError: (error) => {
      console.error('Delete item error:', error);
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to remove item',
        variant: 'destructive',
      });
    },
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-neutral-950 border-yellow-500/30">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Edit Protocol</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Protocol Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Protocol Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter protocol name..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter protocol description..."
                  className="mt-1 min-h-[80px]"
                />
              </div>

              <Button
                onClick={() => updateProtocolMutation.mutate()}
                disabled={updateProtocolMutation.isPending || !name}
                className="w-full bg-green-500 hover:bg-green-600"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateProtocolMutation.isPending ? 'Saving...' : 'Save Protocol Info'}
              </Button>
            </div>

            {/* Protocol Items */}
            <div className="space-y-3">
              <h3 className="font-bold text-lg">Supplements in Protocol</h3>
              
              {protocol.protocol_items?.map((item: any) => (
                <Card
                  key={item.id}
                  className="p-4 border border-border/50 bg-neutral-900/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">
                        {item.supplement_products?.name || 'Unknown'}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {item.supplement_products?.brand || 'Unknown brand'}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline">
                          {item.daily_dosage} {item.dosage_unit}
                        </Badge>
                        {item.intake_times?.map((time: string) => (
                          <Badge key={time} variant="secondary">
                            {time.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingItem(item)}
                        className="border-yellow-500/30 hover:bg-yellow-500/10"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteProtocolItemMutation.mutate(item.id)}
                        disabled={deleteProtocolItemMutation.isPending}
                        className="border-red-500/30 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              {(!protocol.protocol_items || protocol.protocol_items.length === 0) && (
                <p className="text-center py-6 text-muted-foreground">
                  No supplements in this protocol
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      {editingItem && (
        <EditProtocolItemDialog
          item={editingItem}
          open={!!editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}
    </>
  );
}
