import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useImagingTimeline } from "@/hooks/medical-documents/useImagingTimeline";
import { Stethoscope, ChevronDown, MapPin, AlertTriangle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

const severityColors = {
  normal: 'bg-green-500/20 border-green-500/30 text-green-700 dark:text-green-300',
  mild: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-700 dark:text-yellow-300',
  moderate: 'bg-orange-500/20 border-orange-500/30 text-orange-700 dark:text-orange-300',
  severe: 'bg-red-500/20 border-red-500/30 text-red-700 dark:text-red-300',
};

const severityIcons = {
  normal: CheckCircle,
  mild: AlertTriangle,
  moderate: AlertTriangle,
  severe: AlertTriangle,
};

export const ImagingTimeline = () => {
  const { data: documents, isLoading } = useImagingTimeline();
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());

  const toggleDoc = (docId: string) => {
    setExpandedDocs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Таймлайн исследований
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-16 text-muted-foreground">
          <Stethoscope className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p>Нет МРТ/УЗИ документов</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-primary" />
          Таймлайн исследований
        </CardTitle>
        <CardDescription>
          {documents.length} исследований за все время
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4 before:absolute before:left-[15px] before:top-0 before:bottom-0 before:w-[2px] before:bg-border">
          {documents.map((doc, idx) => {
            const isExpanded = expandedDocs.has(doc.id);
            const primarySeverity = doc.findings[0]?.severity || 'normal';
            const SeverityIcon = severityIcons[primarySeverity as keyof typeof severityIcons];

            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="relative pl-12"
              >
                {/* Timeline Dot */}
                <div className={`absolute left-0 top-3 w-[30px] h-[30px] rounded-full border-2 flex items-center justify-center ${severityColors[primarySeverity as keyof typeof severityColors]}`}>
                  <SeverityIcon className="h-4 w-4" />
                </div>

                <Collapsible open={isExpanded} onOpenChange={() => toggleDoc(doc.id)}>
                  <Card className={`${severityColors[primarySeverity as keyof typeof severityColors]} border-l-4`}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-accent/5 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base flex items-center gap-2">
                              {new Date(doc.document_date).toLocaleDateString('ru-RU', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                              <Badge variant="outline" className="text-xs">
                                {doc.findings.length} находок
                              </Badge>
                            </CardTitle>
                            <CardDescription className="mt-1 line-clamp-2">
                              {doc.ai_summary || doc.file_name}
                            </CardDescription>
                          </div>
                          <ChevronDown className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="pt-0 space-y-3">
                        {doc.findings.length > 0 ? (
                          doc.findings.map((finding, fIdx) => {
                            const FindingIcon = severityIcons[finding.severity as keyof typeof severityIcons];
                            return (
                              <motion.div
                                key={fIdx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: fIdx * 0.05 }}
                                className={`p-3 rounded-lg border ${severityColors[finding.severity as keyof typeof severityColors]}`}
                              >
                                <div className="flex items-start gap-2 mb-2">
                                  <FindingIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <MapPin className="h-3 w-3" />
                                      <span className="font-medium text-sm">{finding.body_part}</span>
                                      <Badge variant="secondary" className="text-xs">
                                        {finding.severity}
                                      </Badge>
                                    </div>
                                    <p className="text-sm">{finding.finding_text}</p>
                                    {finding.tags && finding.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {finding.tags.map(tag => (
                                          <Badge key={tag} variant="outline" className="text-xs">
                                            {tag}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })
                        ) : (
                          <p className="text-sm text-muted-foreground">Нет детальных находок</p>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
