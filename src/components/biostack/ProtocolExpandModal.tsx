import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProtocolItemsList } from "@/components/biostack/ProtocolItemsList";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ProtocolExpandModalProps {
  protocol: any;
  open: boolean;
  onClose: () => void;
  onLogItem: (itemId: string, servingsTaken?: number) => void;
}

export function ProtocolExpandModal({
  protocol,
  open,
  onClose,
  onLogItem
}: ProtocolExpandModalProps) {
  if (!protocol) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-neutral-950 border-green-500/30">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-foreground">
              {protocol.name}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {protocol.description && (
            <p className="text-sm text-muted-foreground mt-2">
              {protocol.description}
            </p>
          )}
        </DialogHeader>

        <div className="mt-4">
          <ProtocolItemsList
            items={protocol.protocol_items || []}
            onLogItem={onLogItem}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
