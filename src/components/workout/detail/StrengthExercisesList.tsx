import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Dumbbell, Link2 } from "lucide-react";
import { GroupedExercise } from "@/hooks/useStrengthWorkoutLogs";

interface StrengthExercisesListProps {
  exercises: GroupedExercise[];
}

export default function StrengthExercisesList({ exercises }: StrengthExercisesListProps) {
  if (!exercises.length) {
    return (
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardContent className="py-8 text-center">
          <Dumbbell className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">Нет данных об упражнениях</p>
          <p className="text-xs text-muted-foreground mt-1">
            Упражнения появятся после синхронизации с журналом
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-primary" />
          Упражнения ({exercises.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Accordion type="multiple" className="space-y-2">
          {exercises.map((exercise, idx) => (
            <AccordionItem
              key={`${exercise.exerciseName}-${idx}`}
              value={`exercise-${idx}`}
              className="border border-border/50 rounded-lg px-4 bg-background/30"
            >
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {exercise.exerciseName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {exercise.sets.length} подход(ов) · {(exercise.totalVolume / 1000).toFixed(1)}т
                    </p>
                  </div>
                  {exercise.isSuperset && (
                    <Badge variant="outline" className="text-xs gap-1 shrink-0">
                      <Link2 className="w-3 h-3" />
                      SS
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {exercise.sets.map((set, setIdx) => (
                    <div
                      key={setIdx}
                      className="flex items-center justify-between bg-secondary/30 rounded-md px-3 py-2"
                    >
                      <span className="text-sm text-muted-foreground">
                        Подход {set.setNumber}
                      </span>
                      <span className="font-medium text-foreground">
                        {set.weight ? `${set.weight}кг` : '—'} × {set.reps || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
