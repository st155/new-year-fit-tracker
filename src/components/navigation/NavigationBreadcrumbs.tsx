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
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <div key={index} className="flex items-center gap-1">
            {item.path ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 gap-1.5 hover:text-foreground hover:bg-accent transition-colors"
                onClick={() => navigate(item.path!)}
              >
                {item.icon && (
                  <span className="text-muted-foreground">{item.icon}</span>
                )}
                <span className="font-medium">{item.label}</span>
              </Button>
            ) : (
              <span className={`flex items-center gap-1.5 px-2 h-8 ${
                isLast 
                  ? 'text-foreground font-semibold' 
                  : 'text-muted-foreground'
              }`}>
                {item.icon && (
                  <span className={isLast ? 'text-primary' : 'text-muted-foreground'}>
                    {item.icon}
                  </span>
                )}
                {item.label}
              </span>
            )}
            
            {!isLast && (
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
            )}
          </div>
        );
      })}
    </nav>
  );
};
