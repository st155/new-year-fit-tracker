import { motion } from "framer-motion";
import { FileText, Zap, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProtocolGridCardProps {
  protocol: any;
  onToggleActive: (id: string) => void;
  onDelete: (id: string) => void;
  onTakeAll: (protocolId: string) => void;
  onExpand: (protocolId: string) => void;
}

export function ProtocolGridCard({
  protocol,
  onToggleActive,
  onDelete,
  onTakeAll,
  onExpand
}: ProtocolGridCardProps) {
  const itemsCount = protocol.protocol_items?.length || 0;
  const adherenceRate = 85; // Mock, could be calculated from logs

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className="bg-neutral-950 border border-green-500/30 rounded-lg p-4 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all cursor-pointer"
      onClick={() => onExpand(protocol.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileText className="h-4 w-4 text-green-500 shrink-0" />
          <h3 className="font-semibold text-sm text-foreground truncate">
            {protocol.name}
          </h3>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-800">
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              onToggleActive(protocol.id);
            }}>
              {protocol.is_active ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                onDelete(protocol.id);
              }}
              className="text-red-500"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Description */}
      {protocol.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {protocol.description}
        </p>
      )}

      {/* Stats */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{itemsCount} supplements</span>
          <Badge variant="outline" className="text-xs border-green-500/30 text-green-500">
            {adherenceRate}% adherence
          </Badge>
        </div>
        <Progress value={adherenceRate} className="h-1 bg-neutral-800">
          <div className="h-full bg-green-500 rounded-full" style={{ width: `${adherenceRate}%` }} />
        </Progress>
      </div>

      {/* Action Button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full border-green-500/30 text-green-500 hover:bg-green-500/10"
        onClick={(e) => {
          e.stopPropagation();
          onTakeAll(protocol.id);
        }}
      >
        <Zap className="h-3 w-3 mr-1" />
        Take All
      </Button>
    </motion.div>
  );
}
