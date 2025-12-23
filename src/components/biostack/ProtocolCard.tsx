import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Power, Trash2, Calendar, Pill } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ProtocolItemsList } from "./ProtocolItemsList";
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

interface ProtocolCardProps {
  protocol: {
    id: string;
    name: string;
    description?: string;
    is_active: boolean;
    start_date?: string;
    planned_end_date?: string;
    protocol_items: Array<{
      id: string;
      daily_dosage?: number;
      intake_times?: string[];
      notes?: string;
      linked_product_id?: string | null;
      supplement_products?: {
        name: string;
        brand?: string;
        form?: string;
        image_url?: string;
      };
      linked_product?: {
        id: string;
        name: string;
        brand?: string;
        form?: string;
        image_url?: string;
      } | null;
    }>;
  };
  onToggleActive: () => void;
  onDelete: () => void;
  onLogItem: (itemId: string) => void;
  onLinkItem?: (itemId: string, currentLinkedId: string | null, itemName: string) => void;
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

  const itemsCount = protocol.protocol_items?.length || 0;
  const intakeTimes = Array.from(
    new Set(
      protocol.protocol_items?.flatMap(item => item.intake_times || []) || []
    )
  );

  return (
    <>
      <Card 
        className={cn(
          "bg-card border transition-all duration-300",
          protocol.is_active 
            ? "border-primary shadow-[0_0_10px_rgba(var(--primary),0.2)]" 
            : "border-border opacity-60"
        )}
      >
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                  {protocol.name}
                </h3>
                <Badge 
                  variant={protocol.is_active ? "default" : "outline"}
                  className="shrink-0 text-xs"
                >
                  {protocol.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              {protocol.description && (
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                  {protocol.description}
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Pill className="h-3 w-3" />
              <span className="text-xs">{itemsCount} supplement{itemsCount !== 1 ? 's' : ''}</span>
            </div>
            {intakeTimes.length > 0 && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span className="text-xs capitalize">
                  {intakeTimes.join(", ")}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex-1"
            >
              <ChevronDown className={cn(
                "h-4 w-4 mr-2 transition-transform",
                isExpanded && "rotate-180"
              )} />
              {isExpanded ? "Hide" : "Show"} Items
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleActive}
              className={cn(
                "shrink-0",
                protocol.is_active && "text-primary"
              )}
            >
              <Power className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="shrink-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Expanded Items List */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <ProtocolItemsList 
                  items={protocol.protocol_items || []}
                  onLogItem={onLogItem}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Protocol?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{protocol.name}" and all its items. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete();
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
