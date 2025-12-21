import { useState, useCallback, useRef } from 'react';
import { Upload, X, Check, Loader2, AlertCircle, Sparkles, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { calculateFileHash } from '@/lib/fileHash';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useMedicalDocuments, DocumentType } from '@/hooks/useMedicalDocuments';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FileUploadState {
  file: File;
  id: string;
  status: 'queue' | 'hashing' | 'classifying' | 'renaming' | 'uploading' | 'parsing' | 'complete' | 'duplicate' | 'error';
  progress: number;
  classification?: {
    document_type: DocumentType;
    tags: string[];
    suggested_date: string | null;
    confidence: number;
  };
  renamedFileName?: string;
  error?: string;
  duplicateInfo?: {
    originalFileName: string;
    uploadedAt: string;
    documentId: string;
  };
}

export function BulkDocumentUpload() {
  const [files, setFiles] = useState<FileUploadState[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { uploadDocument } = useMedicalDocuments();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  }, []);

  const handleFiles = (newFiles: File[]) => {
    // Validate files
    const validFiles = newFiles.filter(file => {
      const isValidType = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp'].includes(file.type);
      const isValidSize = file.size <= 150 * 1024 * 1024; // 150MB
      
      if (!isValidType) {
        toast({
          title: 'Неподдерживаемый формат',
          description: `Файл ${file.name} имеет неподдерживаемый формат`,
          variant: 'destructive',
        });
        return false;
      }
      
      if (!isValidSize) {
        toast({
          title: 'Файл слишком большой',
          description: `Файл ${file.name} превышает 150 МБ`,
          variant: 'destructive',
        });
        return false;
      }
      
      return true;
    });

    // Add to queue
    const fileStates: FileUploadState[] = validFiles.map(file => ({
      file,
      id: `${Date.now()}-${Math.random()}`,
      status: 'queue',
      progress: 0,
    }));

    setFiles(prev => [...prev, ...fileStates]);

    // Start processing (max 3 parallel)
    fileStates.forEach((fileState, index) => {
      setTimeout(() => processFile(fileState), index * 500);
    });
  };

  const processFile = async (fileState: FileUploadState) => {
    try {
      // Step 0: Calculate file hash and check for duplicates
      setFiles(prev => prev.map(f => 
        f.id === fileState.id ? { ...f, status: 'hashing', progress: 5 } : f
      ));

      console.log('[BulkUpload] Calculating file hash for:', fileState.file.name);
      const fileHash = await calculateFileHash(fileState.file);
      console.log('[BulkUpload] File hash:', fileHash.substring(0, 16) + '...');

      // Check for duplicates
      const { data: duplicate } = await supabase
        .from('medical_documents')
        .select('id, file_name, uploaded_at')
        .eq('file_hash', fileHash)
        .maybeSingle();

      if (duplicate) {
        console.log('[BulkUpload] Duplicate found:', duplicate.file_name);
        setFiles(prev => prev.map(f => 
          f.id === fileState.id 
            ? { 
                ...f, 
                status: 'duplicate', 
                progress: 100,
                duplicateInfo: {
                  originalFileName: duplicate.file_name,
                  uploadedAt: duplicate.uploaded_at,
                  documentId: duplicate.id,
                }
              } 
            : f
        ));
        return; // Skip upload
      }

      // Step 0.5: Read file content for AI analysis (PDFs only)
      let base64Content: string | undefined = undefined;
      if (fileState.file.type === 'application/pdf') {
        console.log('[BulkUpload] Reading PDF content for AI analysis...');
        try {
          const fileBuffer = await fileState.file.arrayBuffer();
          const uint8Array = new Uint8Array(fileBuffer);
          
          // Limit to first ~2MB for classification
          const maxBytes = 2 * 1024 * 1024;
          const truncatedArray = uint8Array.slice(0, Math.min(uint8Array.length, maxBytes));
          
          // Convert to base64 (chunked to avoid stack overflow)
          let binaryString = '';
          const chunkSize = 8192;
          for (let i = 0; i < truncatedArray.length; i += chunkSize) {
            const chunk = truncatedArray.slice(i, i + chunkSize);
            binaryString += String.fromCharCode(...chunk);
          }
          base64Content = btoa(binaryString);
          console.log('[BulkUpload] PDF content prepared:', (base64Content.length / 1024).toFixed(0), 'KB');
        } catch (err) {
          console.warn('[BulkUpload] Failed to read PDF content, will use filename only:', err);
        }
      }

      // Step 1: AI Classification
      setFiles(prev => prev.map(f => 
        f.id === fileState.id ? { ...f, status: 'classifying', progress: 10 } : f
      ));

      const { data: classification, error: classifyError } = await supabase.functions.invoke(
        'ai-classify-document',
        { 
          body: { 
            fileName: fileState.file.name,
            fileContent: base64Content,
            mimeType: fileState.file.type
          } 
        }
      );

      if (classifyError) {
        console.warn('[BulkUpload] Classification failed, using defaults:', classifyError);
      }

      // Validate and sanitize classification
      const validTypes: DocumentType[] = [
        'inbody', 'blood_test', 'vo2max', 'caliper', 
        'prescription', 'fitness_report', 'progress_photo', 
        'training_program', 'other'
      ];

      const aiClassification = classification || {
        document_type: 'other' as DocumentType,
        tags: [],
        suggested_date: null,
        confidence: 0,
      };

      // Fallback for invalid types
      if (!validTypes.includes(aiClassification.document_type)) {
        console.warn(
          `[BulkUpload] Invalid document_type "${aiClassification.document_type}", using "other"`
        );
        aiClassification.document_type = 'other';
      }

      // Handle date - treat 'null' string as null
      const documentDate = aiClassification.suggested_date === 'null' || !aiClassification.suggested_date
        ? undefined 
        : aiClassification.suggested_date;

      setFiles(prev => prev.map(f =>
        f.id === fileState.id 
          ? { ...f, classification: aiClassification, progress: 30 } 
          : f
      ));

      // Step 2: AI Renaming
      setFiles(prev => prev.map(f => 
        f.id === fileState.id ? { ...f, status: 'renaming', progress: 40 } : f
      ));

      const { data: renameData } = await supabase.functions.invoke(
        'ai-rename-document',
        { 
          body: { 
            fileName: fileState.file.name,
            documentType: aiClassification.document_type,
            fileContent: base64Content
          } 
        }
      );

      const finalFileName = renameData?.suggestedName || fileState.file.name;
      console.log('[BulkUpload] Renamed:', fileState.file.name, '→', finalFileName);

      setFiles(prev => prev.map(f =>
        f.id === fileState.id 
          ? { ...f, renamedFileName: finalFileName, progress: 50 } 
          : f
      ));

      // Step 3: Upload to storage and database
      setFiles(prev => prev.map(f => 
        f.id === fileState.id ? { ...f, status: 'uploading', progress: 60 } : f
      ));

      // Create a new File object with the renamed name for proper storage
      const renamedFile = new File([fileState.file], finalFileName, { type: fileState.file.type });

      const uploadedDoc = await uploadDocument.mutateAsync({
        file: renamedFile,
        fileHash,
        documentType: aiClassification.document_type,
        documentDate,
        tags: aiClassification.tags,
        hiddenFromTrainer: true, // Default: hidden
      });

      // Step 4: Parse doctor recommendations for prescription/medical documents
      const recommendationTypes: DocumentType[] = ['prescription', 'fitness_report', 'blood_test', 'other'];
      if (recommendationTypes.includes(aiClassification.document_type) && uploadedDoc?.id) {
        setFiles(prev => prev.map(f => 
          f.id === fileState.id ? { ...f, status: 'parsing', progress: 85 } : f
        ));
        
        console.log('[BulkUpload] Parsing doctor recommendations for:', uploadedDoc.id);
        
        try {
          await supabase.functions.invoke('parse-doctor-recommendations', {
            body: { documentId: uploadedDoc.id }
          });
          console.log('[BulkUpload] Doctor recommendations parsed successfully');
        } catch (parseError) {
          console.warn('[BulkUpload] Recommendation parsing failed (non-blocking):', parseError);
          // Don't fail the upload - recommendations parsing is optional
        }
      }

      // Complete
      setFiles(prev => prev.map(f => 
        f.id === fileState.id ? { ...f, status: 'complete', progress: 100 } : f
      ));

    } catch (error) {
      console.error('[BulkUpload] Upload error:', error);
      
      let errorMessage = 'Ошибка загрузки';
      
      if (error && typeof error === 'object' && 'message' in error) {
        const errMsg = (error as any).message;
        
        if (errMsg.includes('check constraint') || errMsg.includes('violates check')) {
          errorMessage = 'Неподдерживаемый тип документа';
        } else if (errMsg.includes('invalid input syntax for type date')) {
          errorMessage = 'Неверный формат даты';
        } else if (errMsg.includes('violates')) {
          errorMessage = 'Ошибка валидации данных';
        } else if (errMsg.includes('storage')) {
          errorMessage = 'Ошибка загрузки файла';
        } else {
          errorMessage = errMsg.substring(0, 80); // Первые 80 символов
        }
      }
      
      setFiles(prev => prev.map(f => 
        f.id === fileState.id 
          ? { 
              ...f, 
              status: 'error', 
              error: errorMessage
            } 
          : f
      ));
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const retryFile = (id: string) => {
    const fileState = files.find(f => f.id === id);
    if (fileState) {
      setFiles(prev => prev.map(f => 
        f.id === id ? { ...f, status: 'queue', progress: 0, error: undefined } : f
      ));
      processFile({ ...fileState, status: 'queue', progress: 0, error: undefined });
    }
  };

  const getDocumentTypeLabel = (type: DocumentType): string => {
    const labels: Record<DocumentType, string> = {
      inbody: '📊 InBody',
      blood_test: '🩸 Анализ крови',
      fitness_report: '📋 Мед. заключение',
      progress_photo: '📸 Фото прогресса',
      vo2max: '🫁 VO2max',
      caliper: '📏 Калипер',
      prescription: '💊 Рецепт',
      training_program: '🏋️ Программа',
      other: '📄 Документ',
    };
    return labels[type] || '📄 Документ';
  };

  const activeUploads = files.filter(f => f.status !== 'complete').length;

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <Card
        className={cn(
          'border-2 border-dashed transition-all cursor-pointer',
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
          activeUploads > 0 && 'opacity-50 cursor-not-allowed'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => activeUploads === 0 && fileInputRef.current?.click()}
      >
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <Upload className="h-8 w-8 text-primary" />
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-1">
                Загрузите ваши медицинские документы
              </h3>
              <p className="text-sm text-muted-foreground">
                Перетащите файлы сюда или нажмите для выбора
              </p>
            </div>

            <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
              <p>Поддержка: PDF, JPG, PNG, HEIC, WEBP</p>
              <p>До 150 МБ на файл, до 20 файлов одновременно</p>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,image/jpeg,image/png,image/heic,image/webp"
                className="hidden"
                onChange={handleFileInput}
                disabled={activeUploads > 0}
              />
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                disabled={activeUploads > 0}
              >
                Выбрать файлы
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Queue */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">
              Загружаемые файлы ({files.filter(f => f.status === 'complete').length}/{files.length})
            </h3>
            {files.every(f => f.status === 'complete' || f.status === 'error') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFiles([])}
              >
                Очистить
              </Button>
            )}
          </div>

          {files.map(fileState => (
            <Card key={fileState.id}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* File Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{fileState.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(fileState.file.size / 1024 / 1024).toFixed(2)} МБ
                      </p>
                    </div>

                    {fileState.status === 'complete' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(fileState.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Classification Info */}
                  {fileState.classification && (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="gap-1">
                        <Sparkles className="h-3 w-3" />
                        {getDocumentTypeLabel(fileState.classification.document_type)}
                      </Badge>
                      {fileState.classification.tags.map(tag => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    {fileState.status === 'queue' && (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">В очереди...</span>
                      </>
                    )}
                    {fileState.status === 'hashing' && (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Проверка дубликатов...</span>
                      </>
                    )}
                    {fileState.status === 'classifying' && (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="text-sm text-blue-600">AI классифицирует...</span>
                      </>
                    )}
                    {fileState.status === 'renaming' && (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                        <span className="text-sm text-purple-600">Умное переименование...</span>
                      </>
                    )}
                    {fileState.status === 'uploading' && (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm text-primary">Загрузка...</span>
                      </>
                    )}
                    {fileState.status === 'parsing' && (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                        <span className="text-sm text-orange-600">Извлечение рекомендаций...</span>
                      </>
                    )}
                    {fileState.status === 'complete' && (
                      <>
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600">Загружено успешно</span>
                      </>
                    )}
                    {fileState.status === 'duplicate' && (
                      <>
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <div className="flex-1">
                          <span className="text-sm text-amber-600 font-medium">
                            Дубликат
                          </span>
                          {fileState.duplicateInfo && (
                            <p className="text-xs text-muted-foreground">
                              Оригинал: {fileState.duplicateInfo.originalFileName}
                              <br />
                              Загружен: {new Date(fileState.duplicateInfo.uploadedAt).toLocaleDateString('ru-RU', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/medical-documents/${fileState.duplicateInfo?.documentId}`)}
                          className="gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Открыть
                        </Button>
                      </>
                    )}
                    {fileState.status === 'error' && (
                      <>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="text-sm text-destructive">{fileState.error}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => retryFile(fileState.id)}
                          className="ml-auto"
                        >
                          Повторить
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {fileState.status !== 'complete' && fileState.status !== 'error' && (
                    <Progress value={fileState.progress} className="h-1" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
