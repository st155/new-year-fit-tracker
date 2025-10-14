import { useState } from "react";
import { Upload, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from 'pdfjs-dist';

interface InBodyUploadProps {
  onUploadSuccess?: () => void;
  onSuccess?: () => void;
}

export const InBodyUpload = ({ onUploadSuccess, onSuccess }: InBodyUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<string>("");
  const { toast } = useToast();

  const extractInBodyData = (text: string) => {
    // Извлекаем данные из текста парсированного PDF
    const data: any = {};

    // Weight
    const weightMatch = text.match(/Weight[^\d]*(\d+\.?\d*)/i);
    if (weightMatch) data.weight = parseFloat(weightMatch[1]);

    // Skeletal Muscle Mass - ищем SMM или "Skeletal Muscle Mass"
    const smmMatch = text.match(/SMM.*?(\d+\.?\d*)\s*kg|Skeletal Muscle Mass[^\d]*(\d+\.?\d*)/i);
    if (smmMatch) data.skeletal_muscle_mass = parseFloat(smmMatch[1] || smmMatch[2]);

    // Percent Body Fat - ищем PBF или "Percent Body Fat"
    const pbfMatch = text.match(/PBF.*?(\d+\.?\d*)\s*%|Percent Body Fat[^\d]*(\d+\.?\d*)/i);
    if (pbfMatch) data.percent_body_fat = parseFloat(pbfMatch[1] || pbfMatch[2]);

    // Body Fat Mass
    const bodyFatMatch = text.match(/Body Fat Mass[^\d]*(\d+\.?\d*)/i);
    if (bodyFatMatch) data.body_fat_mass = parseFloat(bodyFatMatch[1]);

    // Visceral Fat Area
    const visceralMatch = text.match(/Visceral Fat Area[^\d]*(\d+\.?\d*)/i);
    if (visceralMatch) data.visceral_fat_area = parseFloat(visceralMatch[1]);

    // BMI
    const bmiMatch = text.match(/Body Mass Index[^\d]*(\d+\.?\d*)|BMI[^\d]*(\d+\.?\d*)/i);
    if (bmiMatch) data.bmi = parseFloat(bmiMatch[1] || bmiMatch[2]);

    // BMR
    const bmrMatch = text.match(/Basal Metabolic Rate[^\d]*(\d+)\s*kcal/i);
    if (bmrMatch) data.bmr = parseInt(bmrMatch[1]);

    // Total Body Water
    const tbwMatch = text.match(/Total Body Water[^\d]*(\d+\.?\d*)\s*L/i);
    if (tbwMatch) data.total_body_water = parseFloat(tbwMatch[1]);

    // Protein
    const proteinMatch = text.match(/Protein.*?(\d+\.?\d*)\s*kg/i);
    if (proteinMatch) data.protein = parseFloat(proteinMatch[1]);

    // Minerals
    const mineralsMatch = text.match(/Minerals.*?(\d+\.?\d*)\s*kg/i);
    if (mineralsMatch) data.minerals = parseFloat(mineralsMatch[1]);

    // Segmental Analysis - ищем данные по конечностям
    const segmentalSection = text.match(/Segmental Lean Analysis([\s\S]*?)(?:Whole Body|$)/i);
    if (segmentalSection) {
      const segText = segmentalSection[1];
      
      // Right Arm
      const rightArmMatch = segText.match(/Right Arm[^\d]*(\d+\.?\d*)[^\d]*(\d+\.?\d*)\s*%/i);
      if (rightArmMatch) {
        data.right_arm_mass = parseFloat(rightArmMatch[1]);
        data.right_arm_percent = parseFloat(rightArmMatch[2]);
      }
      
      // Left Arm
      const leftArmMatch = segText.match(/Left Arm[^\d]*(\d+\.?\d*)[^\d]*(\d+\.?\d*)\s*%/i);
      if (leftArmMatch) {
        data.left_arm_mass = parseFloat(leftArmMatch[1]);
        data.left_arm_percent = parseFloat(leftArmMatch[2]);
      }
      
      // Trunk
      const trunkMatch = segText.match(/Trunk[^\d]*(\d+\.?\d*)[^\d]*(\d+\.?\d*)\s*%/i);
      if (trunkMatch) {
        data.trunk_mass = parseFloat(trunkMatch[1]);
        data.trunk_percent = parseFloat(trunkMatch[2]);
      }
      
      // Right Leg
      const rightLegMatch = segText.match(/Right Leg[^\d]*(\d+\.?\d*)[^\d]*(\d+\.?\d*)\s*%/i);
      if (rightLegMatch) {
        data.right_leg_mass = parseFloat(rightLegMatch[1]);
        data.right_leg_percent = parseFloat(rightLegMatch[2]);
      }
      
      // Left Leg
      const leftLegMatch = segText.match(/Left Leg[^\d]*(\d+\.?\d*)[^\d]*(\d+\.?\d*)\s*%/i);
      if (leftLegMatch) {
        data.left_leg_mass = parseFloat(leftLegMatch[1]);
        data.left_leg_percent = parseFloat(leftLegMatch[2]);
      }
    }

    // Test Date
    const dateMatch = text.match(/Test Date.*?(\d{2}\.\d{2}\.\d{4})\s*(\d{2}:\d{2})/i);
    if (dateMatch) {
      const [_, date, time] = dateMatch;
      const [day, month, year] = date.split('.');
      data.test_date = `${year}-${month}-${day}T${time}:00`;
    }

    return data;
  };

  const aggressiveCompressPDF = async (file: File): Promise<Blob> => {
    const TARGET_SIZE = 10 * 1024 * 1024; // 10MB target
    
    if (file.size <= TARGET_SIZE) {
      console.log(`PDF ${(file.size / 1024 / 1024).toFixed(2)}MB - no compression needed`);
      return file;
    }

    console.log(`PDF ${(file.size / 1024 / 1024).toFixed(2)}MB. Applying aggressive compression...`);
    setUploadStage("Сжатие PDF...");
    setUploadProgress(10);
    
    try {
      // Configure pdfjs worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      
      const arrayBuffer = await file.arrayBuffer();
      setUploadProgress(15);
      
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const sourcePdf: any = await Promise.race([
        loadingTask.promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('PDF parse timeout')), 8000))
      ]);
      
      setUploadProgress(20);
      
      // Create new PDF
      const newPdfDoc = await PDFDocument.create();
      const numPages = sourcePdf.numPages;
      const start = Date.now();
      const MAX_MS = 15000;
      
      // Render each page as JPEG and add to new PDF
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await sourcePdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 }); // High quality render
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({ 
          canvasContext: context, 
          viewport,
          canvas 
        }).promise;
        
        // Convert to JPEG with 60% quality
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.6);
        const imageBytes = Uint8Array.from(atob(imageDataUrl.split(',')[1]), c => c.charCodeAt(0));
        
        const jpegImage = await newPdfDoc.embedJpg(imageBytes);
        const pdfPage = newPdfDoc.addPage([viewport.width, viewport.height]);
        pdfPage.drawImage(jpegImage, {
          x: 0,
          y: 0,
          width: viewport.width,
          height: viewport.height,
        });
        
        if (Date.now() - start > MAX_MS) {
          throw new Error('Compression timeout');
        }
        
        // Update progress: 10% to 70% during compression
        const compressionProgress = 10 + Math.floor((pageNum / numPages) * 60);
        setUploadProgress(compressionProgress);
        setUploadStage(`Сжатие PDF... (${pageNum}/${numPages} страниц)`);
      }
      
      setUploadProgress(70);
      setUploadStage("Финализация сжатия...");
      const compressedBytes = await newPdfDoc.save();
      const compressedBlob = new Blob([compressedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const compressionRatio = ((1 - compressedBlob.size / file.size) * 100).toFixed(1);
      
      console.log(`Aggressive compression: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedBlob.size / 1024 / 1024).toFixed(2)}MB (${compressionRatio}% reduction)`);
      
      return compressedBlob;
    } catch (error) {
      console.error('Aggressive compression failed:', error);
      setUploadStage("Сжатие прервано — загружаем оригинал");
      setUploadProgress(70);
      toast({
        title: "Не удалось сжать PDF",
        description: "Попробуем загрузить исходный файл",
        variant: "default",
      });
      return file;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, загрузите PDF файл",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStage("Подготовка файла...");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Пользователь не авторизован');

      setUploadProgress(5);
      setUploadStage("Проверка размера файла...");
      
      // Apply aggressive compression if needed (only if file > 10MB)
      const fileToUpload = await aggressiveCompressPDF(file);

      // Upload PDF to storage
      setUploadProgress(75);
      setUploadStage("Загрузка в облако...");
      
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('inbody-pdfs')
        .upload(fileName, fileToUpload);

      if (uploadError) throw uploadError;

      setUploadProgress(90);
      setUploadStage("Сохранение информации...");
      
      // Create record in inbody_uploads instead of immediate recognition
      const { error: dbError } = await supabase
        .from('inbody_uploads')
        .insert({
          user_id: user.id,
          file_name: file.name,
          storage_path: fileName,
          file_size: fileToUpload instanceof Blob ? fileToUpload.size : file.size,
          status: 'uploaded'
        });

      if (dbError) throw dbError;

      setUploadProgress(100);
      setUploadStage("Готово!");
      
      toast({
        title: "PDF успешно загружен",
        description: "Перейдите в раздел 'История' для распознавания анализа",
      });

      if (onUploadSuccess) onUploadSuccess();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error uploading InBody file:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось загрузить файл",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStage("");
    }
  };

  return (
    <Card className="border-2 border-dashed border-primary/20 bg-card/50 backdrop-blur-sm hover:border-primary/40 transition-all">
      <CardContent className="flex flex-col items-center justify-center py-12 px-6">
        <div className="mb-4">
          {uploading ? (
            <div className="rounded-full bg-primary/10 p-6">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
          ) : (
            <div className="rounded-full bg-primary/10 p-6">
              <FileText className="h-12 w-12 text-primary" />
            </div>
          )}
        </div>

        <h3 className="text-xl font-semibold mb-2">Загрузите InBody Анализ</h3>
        <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
          {uploading
            ? uploadStage
            : "Загрузите PDF файл вашего InBody анализа. После загрузки вы сможете распознать его в разделе 'История'"}
        </p>

        {uploading && (
          <div className="w-full max-w-md mb-6 space-y-2">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-sm text-center text-muted-foreground">
              {uploadProgress}%
            </p>
          </div>
        )}

        <label htmlFor="inbody-upload">
          <Button
            variant="default"
            size="lg"
            disabled={uploading}
            className="cursor-pointer"
            asChild
          >
            <span>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Загрузка...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Выбрать PDF
                </>
              )}
            </span>
          </Button>
        </label>
        <input
          id="inbody-upload"
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          className="hidden"
          disabled={uploading}
        />

        <p className="text-xs text-muted-foreground mt-4">
          Поддерживается только PDF формат
        </p>
      </CardContent>
    </Card>
  );
};
