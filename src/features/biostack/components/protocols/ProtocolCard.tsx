import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronUp, Trash2, Plus, Clock } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ProtocolItemsList } from "./ProtocolItemsList";
import { cn } from "@/lib/utils";

interface ProtocolCardProps {
  protocol: {
    id: string;
    name: string;
    description?: string;
    is_active: boolean;
    protocol_items?: Array<{
      id: string;
      daily_dosage?: number;
      intake_times?: string[];
      notes?: string;
      supplement_products?: {
        name: string;
        brand?: string;
        form?: string;
      };
    }>;
  };
  onToggleActive: (id: string) => void;
  onDelete: (id: string) => void;
  onLogItem: (itemId: string, servingsTaken?: number) => void;
  onLinkItem?: (protocolId: string) => void;
}

export function ProtocolCard({
  protocol,
  onToggleActive,
  onDelete,
  onLogItem,
  onLinkItem
}: ProtocolCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const itemCount = protocol.protocol_items?.length || 0;
  const allIntakeTimes = protocol.protocol_items?.flatMap(item => item.intake_times || []) || [];
  const uniqueIntakeTimes = [...new Set(allIntakeTimes)];

  return (
    <Card className={cn(
      "transition-all",
      protocol.is_active 
        ? "border-green-500/30 bg-green-500/5" 
        : "border-border/50 bg-muted/30 opacity-70"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{protocol.name}</CardTitle>
            {protocol.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {protocol.description}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Switch
              checked={protocol.is_active}
              onCheckedChange={() => onToggleActive(protocol.id)}
              className="data-[state=checked]:bg-green-500"
            />
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-3 mt-3 text-sm">
          <Badge variant="outline" className="text-xs">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </Badge>
          
          {uniqueIntakeTimes.length > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="text-xs capitalize">
                {uniqueIntakeTimes.slice(0, 2).join(', ')}
                {uniqueIntakeTimes.length > 2 && ` +${uniqueIntakeTimes.length - 2}`}
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {/* Action Buttons */}
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-1 justify-start"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 mr-2" />
            ) : (
              <ChevronDown className="h-4 w-4 mr-2" />
            )}
            {isExpanded ? 'Collapse' : 'Expand'} ({itemCount})
          </Button>

          {onLinkItem && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onLinkItem(protocol.id)}
              className="border-green-500/30 text-green-500 hover:bg-green-500/10"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}

          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-red-500/30 text-red-500 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-neutral-950 border-neutral-800">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Protocol?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{protocol.name}" and all its items.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-neutral-700">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    onDelete(protocol.id);
                    setShowDeleteDialog(false);
                  }}
                  className="bg-red-500 hover:bg-red-600"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Expanded Items List */}
        {isExpanded && (
          <ProtocolItemsList
            items={protocol.protocol_items || []}
            onLogItem={onLogItem}
          />
        )}
      </CardContent>
    </Card>
  );
}
