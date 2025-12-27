import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import GoalProgressDetail from "@/components/detail/GoalProgressDetail";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";

// New imports from features/goals
import { useGoalDetailQuery } from "@/features/goals/hooks";

const GoalDetail = () => {
  const { t } = useTranslation('goalDetail');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { data: goal, isLoading: loading, error: queryError } = useGoalDetailQuery(id || '');
  
  // Check access rights
  const hasAccess = goal && (
    goal.user_id === user?.id || // Personal goal
    !goal.is_personal // Challenge goal (public)
  );
  
  const error = queryError 
    ? t('loadError')
    : (goal && !hasAccess) 
      ? t('accessDenied')
      : (!goal && !loading)
        ? t('notFound')
        : null;

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return <PageLoader message={t('loading')} />;
  }

  if (error || !goal || !hasAccess) {
    return (
      <div className="container max-w-4xl mx-auto p-4 md:p-6">
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">{error || t('notFound')}</h3>
              <p className="text-muted-foreground mb-6">
                {t('deletedOrNoAccess')}
              </p>
              <Button onClick={handleBack} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('back')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-6">
      <GoalProgressDetail goal={goal} onBack={handleBack} />
    </div>
  );
};

export default GoalDetail;
