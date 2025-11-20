import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useSupplementLogs } from "@/hooks/supplements/useSupplementLogs";
import { useAuth } from "@/hooks/useAuth";
import { PageLoader } from "@/components/ui/page-loader";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";

export function TodaySchedule() {
  const { user } = useAuth();
  const { todaySchedule, isLoading, markAsTaken } = useSupplementLogs(user?.id);

  if (isLoading) return <PageLoader size="sm" />;

  if (!todaySchedule || todaySchedule.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No supplements scheduled for today
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "taken":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "missed":
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Today's Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {todaySchedule.map((log: any) => {
            const product = log.protocol_items?.supplement_products;
            const scheduledTime = new Date(log.scheduled_time);

            return (
              <div
                key={log.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
              >
                <Checkbox
                  checked={log.status === "taken"}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      markAsTaken.mutate(log.id);
                    }
                  }}
                  disabled={log.status === "taken"}
                />
                
                {getStatusIcon(log.status)}

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{product?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(scheduledTime, "h:mm a")} • {log.servings_taken || 1}{" "}
                    {product?.serving_unit}
                  </p>
                </div>

                {log.status === "scheduled" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markAsTaken.mutate(log.id)}
                  >
                    Mark Taken
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
