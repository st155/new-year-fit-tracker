import { Lightbulb } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGlobalNotifications } from "@/hooks/useGlobalNotifications";
import { useNavigate } from "react-router-dom";

export function GlobalTicker() {
  const { t } = useTranslation('common');
  const { notifications } = useGlobalNotifications();
  const navigate = useNavigate();
  
  // If no notifications, show motivational tips
  const fallbackTips = [
    { icon: '💪', messageKey: 'ticker.tips.followPlan' },
    { icon: '🔥', messageKey: 'ticker.tips.consistency' },
    { icon: '💧', messageKey: 'ticker.tips.stayHydrated' },
    { icon: '🎯', messageKey: 'ticker.tips.keepMoving' },
  ];

  const displayItems = notifications.length > 0 
    ? notifications 
    : fallbackTips.map((tip, i) => ({
        id: `tip-${i}`,
        icon: tip.icon,
        message: t(tip.messageKey),
        href: '/',
      }));

  const handleClick = (href: string) => {
    if (href) navigate(href);
  };

  return (
    <div className="w-full bg-gradient-to-r from-background via-muted/20 to-background border-b border-border/50 py-2 overflow-hidden backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <Lightbulb className="h-4 w-4 text-primary shrink-0 ml-4 animate-pulse" />
        <div className="flex-1 overflow-hidden">
          <div className="flex gap-8 animate-[marquee_40s_linear_infinite] whitespace-nowrap">
            {[...displayItems, ...displayItems].map((item, i) => (
              <span 
                key={`${item.id}-${i}`} 
                className="text-sm text-foreground/80 cursor-pointer hover:text-primary transition-colors flex items-center gap-1.5"
                onClick={() => handleClick(item.href || '/')}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.message}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
