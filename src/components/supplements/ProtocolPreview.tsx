import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, DollarSign, Calendar, Sparkles } from "lucide-react";
import { useSupplementProtocol } from "@/hooks/supplements/useSupplementProtocol";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { SupplementTimeline } from "./SupplementTimeline";
import { useState } from "react";

interface ProtocolPreviewProps {
  protocol: any;
  onClose: () => void;
  onRegenerate: () => void;
}

export function ProtocolPreview({ protocol, onClose, onRegenerate }: ProtocolPreviewProps) {
  const { user } = useAuth();
  const { createProtocol } = useSupplementProtocol(user?.id);
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const handleAccept = async () => {
    if (!user) return;

    setIsCreating(true);
    try {
      // Create the protocol
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (protocol.duration_days || 30));

      await createProtocol.mutateAsync({
        user_id: user.id,
        name: protocol.protocol_name,
        description: protocol.description,
        is_active: true,
        end_date: endDate.toISOString().split("T")[0],
        ai_generated: true,
        ai_rationale: JSON.stringify(protocol.key_considerations),
      });

      toast({
        title: "Protocol created successfully!",
        description: "Your personalized supplement protocol is now active.",
      });

      onClose();
    } catch (error: any) {
      console.error("Error creating protocol:", error);
      toast({
        title: "Failed to create protocol",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {protocol.protocol_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <p className="text-muted-foreground">{protocol.description}</p>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{protocol.duration_days}</p>
                    <p className="text-xs text-muted-foreground">days</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">${protocol.total_estimated_cost}</p>
                    <p className="text-xs text-muted-foreground">per month</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{protocol.recommendations.length}</p>
                    <p className="text-xs text-muted-foreground">supplements</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Recommendations</h3>
            <div className="space-y-3">
              {protocol.recommendations.map((rec: any, index: number) => (
                <Card key={index} className="glass-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{rec.supplement_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {rec.brand_recommendation || "Any quality brand"}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          rec.priority === "high"
                            ? "bg-destructive/20 text-destructive"
                            : rec.priority === "medium"
                            ? "bg-warning/20 text-warning"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {rec.priority}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Dosage:</span>{" "}
                        <span className="font-medium">{rec.dosage}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Frequency:</span>{" "}
                        <span className="font-medium">{rec.frequency}</span>
                      </div>
                    </div>

                    {rec.timing && rec.timing.length > 0 && (
                      <SupplementTimeline times={rec.timing} />
                    )}

                    <div className="p-3 bg-muted rounded-lg text-sm">
                      <p className="font-medium mb-1">Why this supplement:</p>
                      <p className="text-muted-foreground">{rec.reasoning}</p>
                    </div>

                    {rec.warnings && rec.warnings.length > 0 && (
                      <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
                        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-destructive">Warnings:</p>
                          <ul className="list-disc list-inside text-muted-foreground">
                            {rec.warnings.map((warning: string, i: number) => (
                              <li key={i}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {rec.estimated_cost_per_month && (
                      <p className="text-sm text-muted-foreground">
                        Est. cost: ${rec.estimated_cost_per_month}/month
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {protocol.key_considerations && protocol.key_considerations.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold">Key Considerations</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {protocol.key_considerations.map((consideration: string, index: number) => (
                    <li key={index}>{consideration}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {protocol.review_schedule && (
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm">
                <span className="font-medium">Review Schedule:</span> {protocol.review_schedule}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onRegenerate} className="flex-1">
            Regenerate
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAccept} disabled={isCreating} className="flex-1">
            {isCreating ? "Creating..." : "Accept & Create Protocol"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
