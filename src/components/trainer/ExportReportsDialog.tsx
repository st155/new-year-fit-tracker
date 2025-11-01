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
      if (format === 'csv') {
        // Generate CSV content
        const headers = ['Metric', 'Value', 'Date'];
        const rows = [
          headers.join(','),
          // Add sample data - in production, fetch real data
          `"Client","${clientName || 'Unknown'}",""`,
          `"Export Date","${new Date().toLocaleDateString()}",""`,
        ];
        
        const csvContent = rows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `report-${clientName || 'client'}-${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // For PDF, using basic implementation - can be enhanced with jspdf
        toast.info("PDF export coming soon - use CSV for now");
        return;
      }
      
      toast.success(`Report exported as ${format.toUpperCase()}`);
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
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