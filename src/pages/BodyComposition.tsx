import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Upload, TrendingUp, Users } from "lucide-react";
import { BodyCompositionUpload } from "@/components/body-composition/BodyCompositionUpload";
import { BodyCompositionMetrics } from "@/components/body-composition/BodyCompositionMetrics";
import { BodyCompositionComparison } from "@/components/body-composition/BodyCompositionComparison";
import { BodyCompositionHistory } from "@/components/body-composition/BodyCompositionHistory";

export default function BodyComposition() {
  const [showUpload, setShowUpload] = useState(false);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: latestComposition, refetch } = useQuery({
    queryKey: ['latest-body-composition', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      
      const { data, error } = await supabase
        .from('body_composition')
        .select('*')
        .eq('user_id', session.user.id)
        .order('measurement_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Body Composition</h1>
          <p className="text-muted-foreground">
            Track and compare your body composition metrics
          </p>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)} size="lg">
          <Upload className="mr-2 h-5 w-5" />
          Add Measurement
        </Button>
      </div>

      {showUpload && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Body Composition Data</CardTitle>
          </CardHeader>
          <CardContent>
            <BodyCompositionUpload
              onSuccess={() => {
                setShowUpload(false);
                refetch();
              }}
            />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="metrics" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="metrics">
            <TrendingUp className="mr-2 h-4 w-4" />
            My Metrics
          </TabsTrigger>
          <TabsTrigger value="comparison">
            <Users className="mr-2 h-4 w-4" />
            Comparison
          </TabsTrigger>
          <TabsTrigger value="history">
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <BodyCompositionMetrics latestData={latestComposition} />
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <BodyCompositionComparison userId={session?.user?.id} />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <BodyCompositionHistory userId={session?.user?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
