import { useState, useEffect } from "react";
import { Camera, Calendar, Eye, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { FitnessCard } from "@/components/ui/fitness-card";
import { cn } from "@/lib/utils";

interface ProgressPhoto {
  id: string;
  photo_url: string;
  measurement_date: string;
  value: number;
  unit: string;
  notes?: string;
  goal: {
    goal_name: string;
    goal_type: string;
  };
}

export function ProgressGallery() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);

  useEffect(() => {
    fetchProgressPhotos();
  }, [user]);

  const fetchProgressPhotos = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('measurements')
        .select(`
          id,
          photo_url,
          measurement_date,
          value,
          unit,
          notes,
          goals:goal_id (
            goal_name,
            goal_type
          )
        `)
        .eq('user_id', user.id)
        .not('photo_url', 'is', null)
        .neq('photo_url', '')
        .order('measurement_date', { ascending: false });

      if (error) throw error;

      const formattedPhotos = data?.map(item => ({
        id: item.id,
        photo_url: item.photo_url!,
        measurement_date: item.measurement_date,
        value: item.value,
        unit: item.unit,
        notes: item.notes,
        goal: {
          goal_name: (item.goals as any)?.goal_name || 'Неизвестная цель',
          goal_type: (item.goals as any)?.goal_type || 'general'
        }
      })) || [];

      setPhotos(formattedPhotos);
    } catch (error) {
      console.error('Error fetching progress photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGoalTypeColor = (goalType: string) => {
    const colors = {
      strength: 'bg-primary/10 text-primary border-primary/20',
      cardio: 'bg-accent/10 text-accent border-accent/20',
      endurance: 'bg-success/10 text-success border-success/20',
      body_composition: 'bg-secondary/10 text-secondary-foreground border-secondary/20'
    };
    return colors[goalType as keyof typeof colors] || 'bg-muted text-muted-foreground';
  };

  if (loading) {
    return (
      <FitnessCard className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загружаем галерею...</p>
        </div>
      </FitnessCard>
    );
  }

  if (photos.length === 0) {
    return (
      <FitnessCard className="p-6">
        <div className="text-center py-8">
          <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Галерея пуста</h3>
          <p className="text-muted-foreground text-sm">
            Добавьте фотографии к своим измерениям, чтобы отслеживать визуальный прогресс
          </p>
        </div>
      </FitnessCard>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Галерея прогресса
          </h2>
          <p className="text-sm text-muted-foreground">
            {photos.length} {photos.length === 1 ? 'фотография' : 'фотографий'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo, index) => (
          <Dialog key={photo.id}>
            <DialogTrigger asChild>
              <Card 
                className={cn(
                  "group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg animate-fade-in hover-scale",
                )}
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => setSelectedPhoto(photo)}
              >
                <div className="aspect-square">
                  <img
                    src={photo.photo_url}
                    alt={`Progress ${photo.goal.goal_name}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getGoalTypeColor(photo.goal.goal_type)}>
                        {photo.goal.goal_name}
                      </Badge>
                      <Eye className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-white text-xs">
                      <div className="flex items-center gap-1 mb-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(photo.measurement_date), 'dd MMM', { locale: ru })}
                      </div>
                      <div className="font-semibold">
                        {photo.value} {photo.unit}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </DialogTrigger>

            <DialogContent className="max-w-2xl">
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={photo.photo_url}
                    alt={`Progress ${photo.goal.goal_name}`}
                    className="w-full h-auto rounded-lg"
                  />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className={getGoalTypeColor(photo.goal.goal_type)}>
                      {photo.goal.goal_name}
                    </Badge>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(photo.measurement_date), 'dd MMMM yyyy', { locale: ru })}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {photo.value}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {photo.unit}
                      </div>
                    </div>
                  </div>
                  
                  {photo.notes && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm">{photo.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </div>
  );
}