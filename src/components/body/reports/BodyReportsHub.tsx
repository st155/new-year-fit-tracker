import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { InBodyUpload } from '@/components/body-composition/InBodyUpload';
import { InBodyHistory } from '@/components/body-composition/InBodyHistory';
import { FileText, Activity, Scan, Edit3 } from 'lucide-react';
import { useRef } from 'react';
import { Badge } from '@/components/ui/badge';

interface BodyReportsHubProps {
  onReportChange?: () => void;
}

export function BodyReportsHub({ onReportChange }: BodyReportsHubProps) {
  const inbodyHistoryRef = useRef<{ refresh: () => void }>(null);

  const handleUploadSuccess = () => {
    inbodyHistoryRef.current?.refresh();
    onReportChange?.();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Body Reports</h2>
        <p className="text-muted-foreground">
          Upload and manage detailed body composition reports from various sources
        </p>
      </div>

      <Tabs defaultValue="inbody" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="inbody">
            <Activity className="h-4 w-4 mr-2" />
            InBody
          </TabsTrigger>
          <TabsTrigger value="dexa" disabled>
            <Scan className="h-4 w-4 mr-2" />
            DEXA
            <Badge variant="outline" className="ml-2 text-xs">Soon</Badge>
          </TabsTrigger>
          <TabsTrigger value="tanita" disabled>
            <FileText className="h-4 w-4 mr-2" />
            Tanita
            <Badge variant="outline" className="ml-2 text-xs">Soon</Badge>
          </TabsTrigger>
          <TabsTrigger value="manual" disabled>
            <Edit3 className="h-4 w-4 mr-2" />
            Manual
            <Badge variant="outline" className="ml-2 text-xs">Soon</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbody" className="space-y-6">
          <InBodyUpload onUploadSuccess={handleUploadSuccess} />
          <InBodyHistory ref={inbodyHistoryRef} />
        </TabsContent>

        <TabsContent value="dexa">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Scan className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">DEXA Scans - Coming Soon</h3>
              <p className="text-sm">
                Upload and analyze DEXA (Dual-Energy X-ray Absorptiometry) body composition scans
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tanita">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Tanita Analysis - Coming Soon</h3>
              <p className="text-sm">
                Import body composition data from Tanita scales and analyzers
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Edit3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Manual Entry - Coming Soon</h3>
              <p className="text-sm">
                Add body composition measurements manually with custom fields
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
