import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Download,
  Trash2,
  MoreVertical,
  Upload,
  Globe,
  Lock,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  ChallengeTemplate,
  fetchUserTemplates,
  fetchPublicTemplates,
  deleteTemplate,
  exportTemplateAsJSON,
  updateTemplate,
} from "@/lib/challenge-templates";
import { ImportTemplateDialog } from "./ImportTemplateDialog";
import { CreateFromTemplateDialog } from "./CreateFromTemplateDialog";

interface TemplateManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TemplateManager({ open, onOpenChange, onSuccess }: TemplateManagerProps) {
  const { user } = useAuth();
  const [myTemplates, setMyTemplates] = useState<ChallengeTemplate[]>([]);
  const [publicTemplates, setPublicTemplates] = useState<ChallengeTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [createFromTemplateOpen, setCreateFromTemplateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ChallengeTemplate | null>(null);

  useEffect(() => {
    if (open && user?.id) {
      loadTemplates();
    }
  }, [open, user?.id]);

  const loadTemplates = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const [myData, publicData] = await Promise.all([
        fetchUserTemplates(user.id),
        fetchPublicTemplates(),
      ]);
      setMyTemplates(myData);
      setPublicTemplates(publicData);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Ошибка загрузки шаблонов');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    try {
      await deleteTemplate(templateId);
      toast.success('Шаблон удален');
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Ошибка удаления шаблона');
    }
  };

  const handleExport = (template: ChallengeTemplate) => {
    exportTemplateAsJSON(template);
    toast.success('Шаблон экспортирован');
  };

  const handleTogglePublic = async (template: ChallengeTemplate) => {
    try {
      await updateTemplate(template.id!, { is_public: !template.is_public });
      toast.success(template.is_public ? 'Шаблон теперь приватный' : 'Шаблон опубликован');
      loadTemplates();
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Ошибка обновления шаблона');
    }
  };

  const handleUseTemplate = (template: ChallengeTemplate) => {
    setSelectedTemplate(template);
    setCreateFromTemplateOpen(true);
  };

  const filterTemplates = (templates: ChallengeTemplate[]) => {
    return templates.filter(t => {
      const matchesSearch = !searchQuery || 
        t.template_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = !selectedCategory || t.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  };

  const categories = Array.from(new Set([...myTemplates, ...publicTemplates]
    .map(t => t.category)
    .filter(Boolean)));

  const renderTemplateCard = (template: ChallengeTemplate, isOwner: boolean) => (
    <Card key={template.id} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{template.template_name}</CardTitle>
              {template.category && (
                <Badge variant="outline">{template.category}</Badge>
              )}
              {template.is_public && (
                <Badge variant="secondary">
                  <Globe className="w-3 h-3 mr-1" />
                  Public
                </Badge>
              )}
            </div>
            <CardDescription className="mt-2">
              {template.description || 'Нет описания'}
            </CardDescription>
          </div>
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport(template)}>
                  <Download className="w-4 h-4 mr-2" />
                  Экспорт JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleTogglePublic(template)}>
                  {template.is_public ? (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Сделать приватным
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4 mr-2" />
                      Опубликовать
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(template.id!)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Удалить
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{template.template_data.disciplines.length} дисциплин</span>
            {template.duration_weeks && <span>{template.duration_weeks} недель</span>}
            {template.use_count !== undefined && template.use_count > 0 && (
              <span>Использован {template.use_count}x</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {template.template_data.disciplines.slice(0, 3).map((disc, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {disc.discipline_name}
              </Badge>
            ))}
            {template.template_data.disciplines.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{template.template_data.disciplines.length - 3}
              </Badge>
            )}
          </div>
          <Button onClick={() => handleUseTemplate(template)} className="w-full">
            <Sparkles className="w-4 h-4 mr-2" />
            Использовать шаблон
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Библиотека шаблонов челленджей
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search and Filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск шаблонов..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Импорт
              </Button>
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <Badge
                  variant={selectedCategory === null ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory(null)}
                >
                  Все
                </Badge>
                {categories.map(cat => (
                  <Badge
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedCategory(cat!)}
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            )}

            {/* Templates Tabs */}
            <Tabs defaultValue="my" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="my">
                  Мои шаблоны ({myTemplates.length})
                </TabsTrigger>
                <TabsTrigger value="public">
                  Публичные ({publicTemplates.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="my">
                <ScrollArea className="h-[500px] pr-4">
                  {filterTemplates(myTemplates).length === 0 ? (
                    <Card className="p-8 text-center">
                      <p className="text-muted-foreground">
                        {searchQuery || selectedCategory
                          ? 'Шаблоны не найдены'
                          : 'У вас пока нет шаблонов. Создайте первый челлендж и сохраните его как шаблон!'}
                      </p>
                    </Card>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {filterTemplates(myTemplates).map(template => 
                        renderTemplateCard(template, true)
                      )}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="public">
                <ScrollArea className="h-[500px] pr-4">
                  {filterTemplates(publicTemplates).length === 0 ? (
                    <Card className="p-8 text-center">
                      <p className="text-muted-foreground">
                        {searchQuery || selectedCategory
                          ? 'Шаблоны не найдены'
                          : 'Пока нет публичных шаблонов'}
                      </p>
                    </Card>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {filterTemplates(publicTemplates).map(template => 
                        renderTemplateCard(template, false)
                      )}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      <ImportTemplateDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={() => {
          loadTemplates();
          onSuccess?.();
        }}
      />

      {selectedTemplate && (
        <CreateFromTemplateDialog
          open={createFromTemplateOpen}
          onOpenChange={setCreateFromTemplateOpen}
          template={selectedTemplate}
          trainerId={user?.id || ''}
          onSuccess={() => {
            onSuccess?.();
            onOpenChange(false);
          }}
        />
      )}
    </>
  );
}
