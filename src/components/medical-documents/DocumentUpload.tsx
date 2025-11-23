import { useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useMedicalDocuments, DocumentType } from '@/hooks/useMedicalDocuments';
import { toast } from '@/hooks/use-toast';

const documentTypes: { value: DocumentType; label: string }[] = [
  { value: 'inbody', label: 'InBody анализ' },
  { value: 'blood_test', label: 'Анализ крови' },
  { value: 'fitness_report', label: 'Медицинское заключение' },
  { value: 'progress_photo', label: 'Фото прогресса' },
  { value: 'vo2max', label: 'VO2max тест' },
  { value: 'caliper', label: 'Калипер' },
  { value: 'prescription', label: 'Рецепт' },
  { value: 'training_program', label: 'Программа тренировок' },
  { value: 'other', label: 'Другое' },
];

export const DocumentUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('other');
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [hiddenFromTrainer, setHiddenFromTrainer] = useState(false);
  const [tags, setTags] = useState('');

  const { uploadDocument } = useMedicalDocuments();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const maxSize = 150 * 1024 * 1024; // 150MB
      
      if (selectedFile.size > maxSize) {
        toast({
          title: 'Файл слишком большой',
          description: 'Максимальный размер файла — 150 МБ',
          variant: 'destructive',
        });
        e.target.value = '';
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);

    uploadDocument.mutate({
      file,
      documentType,
      documentDate,
      notes: notes || undefined,
      tags: tagArray.length > 0 ? tagArray : undefined,
      hiddenFromTrainer,
    }, {
      onSuccess: () => {
        setFile(null);
        setNotes('');
        setTags('');
        setDocumentType('other');
        setHiddenFromTrainer(false);
        setDocumentDate(new Date().toISOString().split('T')[0]);
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Загрузить документ
        </CardTitle>
        <CardDescription>
          Загрузите медицинские документы, анализы или фотографии прогресса
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file-upload">Файл</Label>
          <div className="flex items-center gap-2">
            <Input
              id="file-upload"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png,.heic"
            />
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                {file.name}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="document-type">Тип документа</Label>
          <Select value={documentType} onValueChange={(value) => setDocumentType(value as DocumentType)}>
            <SelectTrigger id="document-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {documentTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="document-date">Дата документа</Label>
          <Input
            id="document-date"
            type="date"
            value={documentDate}
            onChange={(e) => setDocumentDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Теги (через запятую)</Label>
          <Input
            id="tags"
            placeholder="например: анализ, важно, контроль"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Заметки</Label>
          <Textarea
            id="notes"
            placeholder="Дополнительная информация о документе"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="hidden-from-trainer">Скрыть от тренера</Label>
          <Switch
            id="hidden-from-trainer"
            checked={hiddenFromTrainer}
            onCheckedChange={setHiddenFromTrainer}
          />
        </div>

        <Button
          onClick={handleUpload}
          disabled={!file || uploadDocument.isPending}
          className="w-full"
        >
          {uploadDocument.isPending ? 'Загрузка...' : 'Загрузить документ'}
        </Button>
      </CardContent>
    </Card>
  );
};
