import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export interface Breadcrumb {
  label: string;
  path?: string;
  icon?: React.ReactNode;
}

interface NavigationBreadcrumbsProps {
  items: Breadcrumb[];
}

export const NavigationBreadcrumbs = ({ items }: NavigationBreadcrumbsProps) => {
  const navigate = useNavigate();

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <div key={index} className="flex items-center gap-2">
            {item.path ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 hover:text-foreground"
                onClick={() => navigate(item.path!)}
              >
                {item.icon}
                {item.label}
              </Button>
            ) : (
              <span className={`flex items-center gap-1 px-2 ${isLast ? 'text-foreground font-medium' : ''}`}>
                {item.icon}
                {item.label}
              </span>
            )}
            
            {!isLast && <ChevronRight className="h-4 w-4" />}
          </div>
        );
      })}
    </nav>
  );
};
