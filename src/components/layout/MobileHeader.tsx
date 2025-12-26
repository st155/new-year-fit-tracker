/**
 * MobileHeader - Simplified header for mobile layout
 * Contains: Avatar (left), App name (center), Health Score (right)
 */

import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface MobileHeaderProps {
  healthScore?: number;
  avatarUrl?: string;
  userName?: string;
}

export const MobileHeader = memo(function MobileHeader({
  healthScore = 85,
  avatarUrl,
  userName = "User",
}: MobileHeaderProps) {
  const navigate = useNavigate();

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500/20 text-emerald-500 border-emerald-500/30";
    if (score >= 60) return "bg-amber-500/20 text-amber-500 border-amber-500/30";
    return "bg-red-500/20 text-red-500 border-red-500/30";
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 inset-x-0 z-50 h-14 bg-card/80 backdrop-blur-md border-b border-border/50"
    >
      <div className="flex items-center justify-between px-4 h-full max-w-screen-sm mx-auto">
        {/* Avatar - navigates to profile */}
        <button
          onClick={() => navigate("/profile")}
          className="focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-full"
        >
          <Avatar className="h-9 w-9 ring-2 ring-primary/20">
            <AvatarImage src={avatarUrl} alt={userName} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
              {userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>

        {/* App Name */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-xs">
            E10
          </div>
          <span className="font-semibold text-foreground">Elite10</span>
        </div>

        {/* Health Score Badge */}
        <Badge
          variant="outline"
          className={`px-2.5 py-1 font-semibold text-sm ${getScoreColor(healthScore)}`}
        >
          {healthScore}
        </Badge>
      </div>
    </motion.header>
  );
});
