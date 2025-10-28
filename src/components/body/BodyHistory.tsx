import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BodyHistoryProps {
  history: any[];
  isLoading: boolean;
}

export function BodyHistory({ history, isLoading }: BodyHistoryProps) {
  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No history yet. Start tracking your body composition!
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Weight (kg)</TableHead>
              <TableHead>Body Fat (%)</TableHead>
              <TableHead>Muscle Mass (kg)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((entry, idx) => (
              <TableRow key={entry.id || `entry-${idx}`}>
                <TableCell>
                  {entry.measurement_date 
                    ? new Date(entry.measurement_date).toLocaleDateString()
                    : "-"}
                </TableCell>
                <TableCell>
                  {typeof entry.weight === 'number' ? entry.weight : "-"}
                </TableCell>
                <TableCell>
                  {typeof entry.body_fat_percentage === 'number' 
                    ? entry.body_fat_percentage 
                    : "-"}
                </TableCell>
                <TableCell>
                  {typeof entry.skeletal_muscle_mass === 'number' 
                    ? entry.skeletal_muscle_mass 
                    : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
