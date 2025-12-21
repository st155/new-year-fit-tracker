import { Home, Sparkles, Dumbbell, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Главная', path: '/' },
  { icon: Sparkles, label: 'Советы', path: '/recommendations' },
  { icon: Dumbbell, label: 'Тренировки', path: '/workouts' },
  { icon: User, label: 'Профиль', path: '/profile' },
];

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border/50 shadow-lg"
    >
      <div className="grid grid-cols-4 h-16 max-w-lg mx-auto">
        {navItems.map((item, index) => {
          const active = isActive(item.path);
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 transition-colors duration-200',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {/* Active indicator */}
              {active && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-gradient-primary rounded-full"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}

              {/* Icon */}
              <motion.div
                animate={{
                  scale: active ? 1.1 : 1,
                  y: active ? -2 : 0,
                }}
                transition={{ duration: 0.2 }}
              >
                <Icon 
                  className={cn(
                    'h-5 w-5',
                    active && 'drop-shadow-glow'
                  )} 
                />
              </motion.div>

              {/* Label */}
              <span
                className={cn(
                  'text-[10px] font-medium',
                  active && 'font-semibold'
                )}
              >
                {item.label}
              </span>

              {/* Ripple effect */}
              {active && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.5 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-0 bg-primary/10 rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}
