import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import GoalProgressDetail from "@/components/detail/GoalProgressDetail";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";

interface Goal {
  id: string;
  goal_name: string;
  goal_type: string;
  target_value: number;
  target_unit: string;
  user_id: string;
  challenge_id: string | null;
  is_personal: boolean;
}

const GoalDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && id) {
      fetchGoal();
    }
  }, [user, id]);

  const fetchGoal = async () => {
    if (!user || !id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('goals')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setError("Цель не найдена");
        return;
      }

      // Проверяем права доступа
      const hasAccess = 
        data.user_id === user.id || // Личная цель пользователя
        !data.is_personal; // Или цель челленджа (публичная)

      if (!hasAccess) {
        setError("У вас нет доступа к этой цели");
        return;
      }

      setGoal(data);
    } catch (err) {
      console.error('Error fetching goal:', err);
      setError("Ошибка при загрузке цели");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return <PageLoader message="Загрузка цели..." />;
  }

  if (error || !goal) {
    return (
      <div className="container max-w-4xl mx-auto p-4 md:p-6">
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">{error || "Цель не найдена"}</h3>
              <p className="text-muted-foreground mb-6">
                Возможно, цель была удалена или у вас нет прав для её просмотра
              </p>
              <Button onClick={handleBack} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
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
