import { useNavigate, useLocation } from "react-router-dom";
import { Home, TrendingUp, Target, Trophy, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { memo } from "react";

const mainNavItems = [
  { path: "/dashboard", icon: Home, label: "Главная" },
  { path: "/progress", icon: TrendingUp, label: "Прогресс" },
  { path: "/goals", icon: Target, label: "Цели" },
  { path: "/challenges", icon: Trophy, label: "Челленджи" },
];

const secondaryNavItems = [
  { path: "/leaderboard", label: "Рейтинг" },
  { path: "/body", label: "Тело" },
  { path: "/habits", label: "Привычки" },
  { path: "/fitness-data", label: "Фитнес дата" },
];

export const BottomNavigation = memo(function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border/50 pb-safe">
      <div className="flex items-center justify-around px-2 py-2">
        {/* Main 4 items */}
        {mainNavItems.map((item) => (
          <Button
            key={item.path}
            variant="ghost"
            size="sm"
            onClick={() => navigate(item.path)}
            className={cn(
              "flex flex-col items-center gap-1 h-auto py-2 px-3 min-w-[64px]",
              isActive(item.path) && "text-primary bg-accent/30"
            )}
          >
            <item.icon className="h-6 w-6" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Button>
        ))}
        
        {/* More menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex flex-col items-center gap-1 h-auto py-2 px-3 min-w-[64px]"
            >
              <Menu className="h-6 w-6" />
              <span className="text-[10px] font-medium">Ещё</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto rounded-t-2xl">
            <div className="space-y-2 py-4">
              {secondaryNavItems.map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-lg h-14",
                    isActive(item.path) && "bg-accent/30 text-primary"
                  )}
                  onClick={() => navigate(item.path)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
});
