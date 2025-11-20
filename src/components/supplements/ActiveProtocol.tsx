import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSupplementProtocol } from "@/hooks/supplements/useSupplementProtocol";
import { useAuth } from "@/hooks/useAuth";
import { PageLoader } from "@/components/ui/page-loader";
import { Sparkles, Calendar } from "lucide-react";
import { ProtocolItemCard } from "./ProtocolItemCard";
import { AdherenceChart } from "./AdherenceChart";
import { useState } from "react";
import { ProtocolGenerator } from "./ProtocolGenerator";

export function ActiveProtocol() {
  const { user } = useAuth();
  const { activeProtocol, isLoading } = useSupplementProtocol(user?.id);
  const [showGenerator, setShowGenerator] = useState(false);

  if (isLoading) return <PageLoader message="Loading protocol..." />;

  if (!activeProtocol) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>No Active Protocol</CardTitle>
          <CardDescription>
            Generate a personalized supplement protocol using AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => setShowGenerator(true)}
            className="w-full"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Protocol
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {showGenerator && (
        <ProtocolGenerator onClose={() => setShowGenerator(false)} />
      )}
      
      <Card className="glass-card border-primary/50 shadow-glow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{activeProtocol.name}</CardTitle>
              <CardDescription>{activeProtocol.description}</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGenerator(true)}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              New Protocol
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Period:</span>{" "}
              <span className="font-medium">
                {activeProtocol.start_date && activeProtocol.end_date
                  ? `${new Date(activeProtocol.start_date).toLocaleDateString()} - ${new Date(activeProtocol.end_date).toLocaleDateString()}`
                  : "Ongoing"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Adherence:</span>{" "}
              <span className="font-medium text-primary">
                {activeProtocol.adherence_rate?.toFixed(1) || 0}%
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Progress:</span>{" "}
              <span className="font-medium">
                {activeProtocol.total_taken || 0} / {activeProtocol.total_scheduled || 0}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {user?.id && <AdherenceChart userId={user.id} />}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Protocol Items
        </h3>
        <div className="grid gap-4">
          {activeProtocol.protocol_items?.map((item: any) => (
            <ProtocolItemCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
