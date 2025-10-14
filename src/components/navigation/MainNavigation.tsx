import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Target,
  User,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { CustomNavigationIcon } from "@/components/ui/custom-navigation-icon";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";

import { NotificationBell } from "@/components/notifications/NotificationBell";
import { GlobalTicker } from "@/components/ui/global-ticker";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/translations";

interface NavigationItem {
  title: string;
  href: string;
  icon: React.ElementType;
  description?: string;
  trainerOnly?: boolean;
}

interface NavigationItemExtended {
  title: string;
  href: string;
  iconType: 'home' | 'stats' | 'challenges' | 'activity' | 'integrations' | 'connections' | 'settings' | 'trainer';
  description?: string;
  trainerOnly?: boolean;
}

const navigationItems: NavigationItemExtended[] = [
  {
    title: "navigation.home",
    href: "/",
    iconType: "home",
    description: "descriptions.home",
  },
  {
    title: "navigation.dashboard",
    href: "/dashboard",
    iconType: "stats",
    description: "descriptions.dashboard",
  },
  {
    title: "navigation.challenges",
    href: "/challenges",
    iconType: "challenges",
    description: "descriptions.challenges",
  },
  {
    title: "navigation.progress",
    href: "/progress",
    iconType: "stats",
    description: "descriptions.progress",
  },
  {
    title: "navigation.fitnessData",
    href: "/fitness-data",
    iconType: "activity",
    description: "descriptions.fitnessData",
  },
  {
    title: "navigation.integrations",
    href: "/integrations",
    iconType: "integrations",
    description: "descriptions.integrations",
  },
  {
    title: "navigation.feed",
    href: "/feed",
    iconType: "activity",
    description: "descriptions.feed",
  },
];

const trainerItems: NavigationItemExtended[] = [
  {
    title: "navigation.clients",
    href: "/trainer-dashboard", 
    iconType: "trainer",
    description: "descriptions.clients",
    trainerOnly: true,
  },
];

export function MainNavigation() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isTrainer, setIsTrainer] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (user) {
      checkTrainerRole();
    }
  }, [user]);

  const checkTrainerRole = async () => {
    if (!user) return;

    const { data: roles, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['trainer', 'admin']);

    if (!error && roles && roles.length > 0) {
      setIsTrainer(true);
    } else {
      // Проверяем старый способ
      const { data: profile } = await supabase
        .from('profiles')
        .select('trainer_role')
        .eq('user_id', user.id)
        .single();

      if (profile?.trainer_role) {
        setIsTrainer(true);
      }
    }
  };

  const isActiveRoute = (href: string) => {
    if (href === "/" && location.pathname === "/") return true;
    if (href !== "/" && location.pathname.startsWith(href)) return true;
    return false;
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getUserInitials = () => {
    const email = user?.email || "";
    const parts = email.split("@")[0].split(".");
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const allItems = [...navigationItems, ...(isTrainer ? trainerItems : [])];

  return (
    <>
      <header className="sticky top-0 z-50 w-full glass-nav">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 min-w-0">
            <Target className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
            <span className="font-bold text-lg sm:text-xl truncate">Elite10</span>
          </Link>

          {/* Desktop Navigation */}
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>{t('navigation.navigation')}</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[300px] gap-3 p-4 sm:w-[400px] md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                    {allItems.map((item) => (
                      <li key={item.href}>
                        <NavigationMenuLink asChild>
                          <Link
                            to={item.href}
                            className={cn(
                              "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                              isActiveRoute(item.href) && "bg-accent text-accent-foreground"
                            )}
                          >
                            <div className="flex items-center space-x-2">
                              <CustomNavigationIcon 
                                type={item.iconType} 
                                isActive={isActiveRoute(item.href)}
                                className="scale-75"
                              />
                              <div className="text-sm font-medium leading-none">
                                {t(item.title)}
                              </div>
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              {t(item.description)}
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* User Menu & Mobile Navigation */}
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
            {/* Notification Bell */}
            <NotificationBell />
            
            {/* User Avatar Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" alt={user?.email} />
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{t('navigation.account')}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>{t('navigation.profile')}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/integrations" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>{t('navigation.settings')}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center">
                  <ThemeToggle />
                  <span className="ml-2">{t('navigation.theme')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('navigation.logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">{t('navigation.openMenu')}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[400px] max-w-[90vw]">
                <SheetHeader>
                  <SheetTitle>{t('navigation.navigation')}</SheetTitle>
                  <SheetDescription>
                    {t('navigation.selectPage')}
                  </SheetDescription>
                </SheetHeader>
                <div className="grid gap-4 py-4">
                  {allItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                        isActiveRoute(item.href) && "bg-accent text-accent-foreground"
                      )}
                    >
                      <CustomNavigationIcon 
                        type={item.iconType} 
                        isActive={isActiveRoute(item.href)}
                        className="scale-90"
                      />
                      <div>
                        <div>{t(item.title)}</div>
                        {item.description && (
                          <div className="text-xs text-muted-foreground">
                            {t(item.description)}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <GlobalTicker />
    </>
  );
}