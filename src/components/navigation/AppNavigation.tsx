import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Home, 
  Target, 
  Trophy, 
  BarChart3, 
  User, 
  Settings,
  Menu,
  X 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";

interface NavigationItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navigationItems: NavigationItem[] = [
  { path: "/", label: "Главная", icon: Home },
  { path: "/progress", label: "Прогресс", icon: Target },
  { path: "/challenges", label: "Челленджи", icon: Trophy },
  { path: "/dashboard", label: "Дашборд", icon: BarChart3 },
  { path: "/profile", label: "Профиль", icon: User },
];

export function AppNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center space-x-1 bg-card/50 backdrop-blur rounded-full p-2 border border-border/50">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Button
              key={item.path}
              variant={active ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate(item.path)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                active 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "hover:bg-muted/80"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{item.label}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {item.badge}
                </Badge>
              )}
            </Button>
          );
        })}
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="p-2">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <SheetHeader>
              <SheetTitle className="text-left">Навигация</SheetTitle>
            </SheetHeader>
            
            <div className="mt-6 space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                
                return (
                  <Button
                    key={item.path}
                    variant={active ? "default" : "ghost"}
                    onClick={() => handleNavigation(item.path)}
                    className={`w-full justify-start gap-3 ${
                      active ? "bg-primary text-primary-foreground" : ""
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto">
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}