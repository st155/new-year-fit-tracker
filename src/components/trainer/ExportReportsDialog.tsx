import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, FileText, Table } from "lucide-react";
import { toast } from "sonner";

interface ExportReportsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  clientName?: string;
}

export const ExportReportsDialog = ({ 
  open, 
  onOpenChange,
  clientId,
  clientName 
}: ExportReportsDialogProps) => {
  const [format, setFormat] = useState<"pdf" | "csv">("pdf");
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeMetrics, setIncludeMetrics] = useState(true);
  const [includeGoals, setIncludeGoals] = useState(true);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    
    try {
      // TODO: Implement actual export logic
      // For PDF: use jspdf
      // For CSV: generate CSV string and download
      
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate export
      
      toast.success(`Report exported as ${format.toUpperCase()}`);
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to export report");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Client Report</DialogTitle>
          <DialogDescription>
            {clientName ? `Export report for ${clientName}` : "Choose export options"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Format</Label>
            <div className="flex gap-2">
              <Button
                variant={format === "pdf" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setFormat("pdf")}
              >
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button
                variant={format === "csv" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setFormat("csv")}
              >
                <Table className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Include in export</Label>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="charts" 
                checked={includeCharts}
                onCheckedChange={(checked) => setIncludeCharts(checked as boolean)}
                disabled={format === "csv"}
              />
              <Label 
                htmlFor="charts" 
                className={format === "csv" ? "text-muted-foreground" : "cursor-pointer"}
              >
                Progress charts {format === "csv" && "(PDF only)"}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="metrics" 
                checked={includeMetrics}
                onCheckedChange={(checked) => setIncludeMetrics(checked as boolean)}
              />
              <Label htmlFor="metrics" className="cursor-pointer">
                Metrics data
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="goals" 
                checked={includeGoals}
                onCheckedChange={(checked) => setIncludeGoals(checked as boolean)}
              />
              <Label htmlFor="goals" className="cursor-pointer">
                Goals progress
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={exporting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleExport}
            disabled={exporting || (!includeCharts && !includeMetrics && !includeGoals)}
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Exporting..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};