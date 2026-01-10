import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plug, CheckCircle2, AlertCircle, XCircle, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import type { Integration } from '@/hooks/profile/useProfileSummary';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

interface IntegrationStatusProps {
  integrations: Integration[];
  isLoading?: boolean;
}

const providerConfig: Record<string, { name: string; color: string; bgColor: string }> = {
  'WHOOP': { name: 'WHOOP', color: 'text-yellow-600', bgColor: 'bg-yellow-500/10' },
  'GARMIN': { name: 'Garmin', color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
  'OURA': { name: 'Oura', color: 'text-purple-600', bgColor: 'bg-purple-500/10' },
  'WITHINGS': { name: 'Withings', color: 'text-cyan-600', bgColor: 'bg-cyan-500/10' },
  'GOOGLE': { name: 'Google Fit', color: 'text-red-600', bgColor: 'bg-red-500/10' },
  'ULTRAHUMAN': { name: 'Ultrahuman', color: 'text-orange-600', bgColor: 'bg-orange-500/10' },
  'APPLE': { name: 'Apple Health', color: 'text-pink-600', bgColor: 'bg-pink-500/10' },
  'FITBIT': { name: 'Fitbit', color: 'text-teal-600', bgColor: 'bg-teal-500/10' },
  'POLAR': { name: 'Polar', color: 'text-red-600', bgColor: 'bg-red-500/10' },
  'SUUNTO': { name: 'Suunto', color: 'text-indigo-600', bgColor: 'bg-indigo-500/10' },
};

const getDateLocale = () => i18n.language === 'ru' ? ru : enUS;

const getStatusConfig = (t: (key: string) => string) => ({
  active: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'text-green-500', label: t('integrations:profile.status.active') },
  stale: { icon: <AlertCircle className="h-3.5 w-3.5" />, color: 'text-yellow-500', label: t('integrations:profile.status.stale') },
  expired: { icon: <XCircle className="h-3.5 w-3.5" />, color: 'text-red-500', label: t('integrations:profile.status.expired') },
});

function formatLastSync(dateStr: string | null, t: (key: string) => string): string {
  if (!dateStr) return t('integrations:profile.lastSync.never');
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: getDateLocale() });
  } catch {
    return t('integrations:profile.lastSync.unknown');
  }
}

export function IntegrationStatus({ integrations, isLoading }: IntegrationStatusProps) {
  const { t } = useTranslation('integrations');
  const navigate = useNavigate();
  const statusConfig = getStatusConfig(t);

  if (isLoading) {
    return (
      <Card className="border-2 border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plug className="h-5 w-5 text-purple-500" />
            {t('profile.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!integrations || integrations.length === 0) {
    return (
      <Card className="border-2 border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plug className="h-5 w-5 text-purple-500" />
            {t('profile.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Plug className="h-8 w-8 mx-auto mb-2 opacity-30 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('profile.noDevices')}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => navigate('/integrations')}
            >
              <ExternalLink className="h-4 w-4 mr-1.5" />
              {t('profile.connect')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort: active first, then stale, then expired
  const sortedIntegrations = [...integrations].sort((a, b) => {
    const order = { active: 0, stale: 1, expired: 2 };
    return order[a.status] - order[b.status];
  });

  const activeCount = integrations.filter(i => i.status === 'active').length;
  const hasIssues = integrations.some(i => i.status !== 'active');

  return (
    <Card className="border-2 border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plug className="h-5 w-5 text-purple-500" />
            {t('profile.title')}
          </CardTitle>
          <Badge 
            variant={hasIssues ? "outline" : "default"} 
            className={hasIssues ? "border-yellow-500/50 text-yellow-600" : "bg-green-500/20 text-green-600 border-green-500/30"}
          >
            {t('profile.activeOf', { count: activeCount, total: integrations.length })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {sortedIntegrations.map((integration, index) => {
            const provider = providerConfig[integration.provider.toUpperCase()] || {
              name: integration.provider,
              color: 'text-gray-600',
              bgColor: 'bg-gray-500/10'
            };
            const status = statusConfig[integration.status];

            return (
              <motion.div
                key={integration.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
              >
                <Badge
                  variant="outline"
                  className={`${provider.bgColor} border-transparent px-2.5 py-1 h-auto cursor-default`}
                  title={`${provider.name}: ${formatLastSync(integration.lastSync, t)}`}
                >
                  <span className={`${status.color} mr-1.5`}>{status.icon}</span>
                  <span className={`${provider.color} font-medium`}>{provider.name}</span>
                </Badge>
              </motion.div>
            );
          })}
        </div>
        
        {hasIssues && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/integrations')}
            >
              <AlertCircle className="h-3.5 w-3.5 mr-1.5 text-yellow-500" />
              {t('profile.attentionNeeded')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
