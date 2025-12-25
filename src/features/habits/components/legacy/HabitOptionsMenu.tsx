import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, Archive, Trash2, BarChart3 } from "lucide-react";

interface HabitOptionsMenuProps {
  onEdit?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onViewHistory?: () => void;
  onDeletePermanent?: () => void;
}

export function HabitOptionsMenu({
  onEdit,
  onArchive,
  onDelete,
  onViewHistory,
  onDeletePermanent,
}: HabitOptionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8 hover:bg-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 glass-strong border-white/20">
        {onEdit && (
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="hover:bg-white/10 cursor-pointer"
          >
            <Edit className="mr-2 h-4 w-4" />
            <span>Редактировать</span>
          </DropdownMenuItem>
        )}
        
        {onViewHistory && (
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              onViewHistory();
            }}
            className="hover:bg-white/10 cursor-pointer"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            <span>История</span>
          </DropdownMenuItem>
        )}
        
        {(onEdit || onViewHistory) && (onArchive || onDelete) && (
          <DropdownMenuSeparator className="bg-white/10" />
        )}
        
        {onArchive && (
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              onArchive();
            }}
            className="hover:bg-white/10 cursor-pointer"
          >
            <Archive className="mr-2 h-4 w-4" />
            <span>Архивировать</span>
          </DropdownMenuItem>
        )}
        
        {(onArchive || onDelete) && onDeletePermanent && (
          <DropdownMenuSeparator className="bg-white/10" />
        )}
        
        {onDelete && (
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-destructive hover:bg-destructive/10 cursor-pointer"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Удалить навсегда</span>
          </DropdownMenuItem>
        )}
        
        {onDeletePermanent && (
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              onDeletePermanent();
            }}
            className="text-destructive hover:bg-destructive/10 cursor-pointer"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Удалить навсегда</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
