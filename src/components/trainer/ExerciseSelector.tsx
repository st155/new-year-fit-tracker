import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EXERCISES, getExerciseCategories, Exercise } from '@/lib/exercises-database';
import { Search, Dumbbell } from 'lucide-react';

interface ExerciseSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
}

export const ExerciseSelector = ({ open, onClose, onSelect }: ExerciseSelectorProps) => {
  const { t } = useTranslation('trainer');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const categories = getExerciseCategories();

  const filteredExercises = EXERCISES.filter(exercise => {
    const matchesSearch = exercise.nameRu.toLowerCase().includes(search.toLowerCase()) ||
                         exercise.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || exercise.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelect = (exercise: Exercise) => {
    onSelect(exercise);
    onClose();
    setSearch('');
    setSelectedCategory(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('exerciseSelector.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Поиск */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('exerciseSelector.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Категории */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedCategory === null ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(null)}
            >
              {t('exerciseSelector.all')}
            </Badge>
            {categories.map(cat => (
              <Badge
                key={cat.value}
                variant={selectedCategory === cat.value ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(cat.value)}
              >
                {cat.label}
              </Badge>
            ))}
          </div>

          {/* Список упражнений */}
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filteredExercises.map(exercise => (
                <div
                  key={exercise.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleSelect(exercise)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Dumbbell className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{exercise.nameRu}</p>
                      <p className="text-sm text-muted-foreground">{exercise.name}</p>
                      {exercise.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {exercise.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="secondary">
                      {categories.find(c => c.value === exercise.category)?.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {exercise.equipment}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
