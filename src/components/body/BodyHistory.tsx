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
            {history.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  {new Date(entry.measurement_date).toLocaleDateString()}
                </TableCell>
                <TableCell>{entry.weight || "-"}</TableCell>
                <TableCell>{entry.body_fat_percentage || "-"}</TableCell>
                <TableCell>{entry.muscle_mass || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
