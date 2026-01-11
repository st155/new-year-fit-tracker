import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, LogOut, RotateCcw, Shield, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';

interface AccountSectionProps {
  email: string;
  userId: string;
  onResetOnboarding: () => void;
  onSignOut: () => void;
  isLoading?: boolean;
}

export function AccountSection({
  email,
  userId,
  onResetOnboarding,
  onSignOut,
  isLoading
}: AccountSectionProps) {
  const { t } = useTranslation('profile');
  const [copied, setCopied] = useState(false);

  const copyUserId = async () => {
    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-muted">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-muted">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          {t('account.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-0.5">Email</p>
            <p className="font-medium text-sm truncate">{email}</p>
          </div>
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 shrink-0 ml-2">
            {t('account.active')}
          </Badge>
        </motion.div>

        {/* User ID */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-0.5">User ID</p>
            <p className="font-mono text-xs truncate">{userId}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyUserId}
            className="shrink-0 ml-2 h-8 w-8 p-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </motion.div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onResetOnboarding}
            className="flex-1 gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            {t('hero.resetOnboarding')}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onSignOut}
            className="flex-1 gap-2"
          >
            <LogOut className="h-4 w-4" />
            {t('hero.signOut')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
