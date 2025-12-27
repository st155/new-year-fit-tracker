import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowLeft, Share2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";
import { useAuth } from "@/hooks/useAuth";
import { useChallengeReportQuery } from "@/features/challenges";
import { ReportHeader } from "./report/ReportHeader";
import { GoalsProgressSection } from "./report/GoalsProgressSection";
import { ActivitySummaryCard } from "./report/ActivitySummaryCard";
import { HealthSummaryCard } from "./report/HealthSummaryCard";
import { BadgesSection } from "./report/BadgesSection";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ChallengeReportPage() {
  const { id: challengeId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('challenges');

  const isPreview = searchParams.get("preview") === "true";
  const { data: report, isLoading, error } = useChallengeReportQuery(challengeId, user?.id, { preview: isPreview });

  const handleShare = async () => {
    if (!report) return;
    
    const shareData = {
      title: t('report.resultsOf', { name: report.title }),
      text: t('report.shareText', { rank: report.finalRank, name: report.title, points: report.totalPoints }),
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
    }
  };

  if (isLoading) {
    return <PageLoader message={t('report.loading')} />;
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">{t('report.unavailable')}</h1>
          <p className="text-muted-foreground">
            {error?.message || t('report.unavailableDesc')}
          </p>
          <Button onClick={() => navigate("/challenges")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('report.toChallenges')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/challenges/${challengeId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('report.back')}
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4 mr-2" />
              {t('report.share')}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="container mx-auto px-4 py-6 space-y-6 max-w-4xl"
      >
        {isPreview && (
          <Alert className="border-warning/50 bg-warning/10">
            <Eye className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning">
              {t('report.previewAlert')}
            </AlertDescription>
          </Alert>
        )}

        <ReportHeader report={report} />
        
        <GoalsProgressSection 
          goals={report.goals} 
          goalsAchieved={report.goalsAchieved} 
        />
        
        <div className="grid md:grid-cols-2 gap-6">
          <ActivitySummaryCard 
            activity={report.activity} 
            durationDays={report.durationDays} 
          />
          <HealthSummaryCard health={report.health} />
        </div>
        
        <BadgesSection 
          badges={report.badges} 
          streakDays={report.streakDays} 
        />

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center py-8 space-y-4"
        >
          <p className="text-muted-foreground text-sm">
            {t('report.thankYou')}
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/challenges")}
            className="bg-gradient-primary hover:opacity-90"
          >
            {t('report.findNewChallenge')}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default ChallengeReportPage;
