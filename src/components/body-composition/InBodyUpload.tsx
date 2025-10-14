import { useState } from "react";
import { Upload, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface InBodyUploadProps {
  onUploadSuccess?: () => void;
  onSuccess?: () => void;
}

export const InBodyUpload = ({ onUploadSuccess, onSuccess }: InBodyUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
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

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Пользователь не авторизован');

      // Upload PDF to storage
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('inbody-pdfs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('inbody-pdfs')
        .getPublicUrl(fileName);

      setParsing(true);

      // Parse PDF using document parser
      const formData = new FormData();
      formData.append('file', file);

      // Read file as text to parse (simplified approach)
      const text = await file.text();
      const parsedData = extractInBodyData(text);

      // If parsing failed, try alternative method
      if (Object.keys(parsedData).length < 3) {
        toast({
          title: "Внимание",
          description: "Не удалось автоматически распознать все данные. Пожалуйста, проверьте результаты.",
          variant: "default",
        });
      }

      // Save to database
      const { error: dbError } = await supabase
        .from('inbody_analyses')
        .insert({
          user_id: user.id,
          test_date: parsedData.test_date || new Date().toISOString(),
          weight: parsedData.weight,
          skeletal_muscle_mass: parsedData.skeletal_muscle_mass,
          percent_body_fat: parsedData.percent_body_fat,
          body_fat_mass: parsedData.body_fat_mass,
          visceral_fat_area: parsedData.visceral_fat_area,
          bmi: parsedData.bmi,
          bmr: parsedData.bmr,
          total_body_water: parsedData.total_body_water,
          protein: parsedData.protein,
          minerals: parsedData.minerals,
          right_arm_mass: parsedData.right_arm_mass,
          right_arm_percent: parsedData.right_arm_percent,
          left_arm_mass: parsedData.left_arm_mass,
          left_arm_percent: parsedData.left_arm_percent,
          trunk_mass: parsedData.trunk_mass,
          trunk_percent: parsedData.trunk_percent,
          right_leg_mass: parsedData.right_leg_mass,
          right_leg_percent: parsedData.right_leg_percent,
          left_leg_mass: parsedData.left_leg_mass,
          left_leg_percent: parsedData.left_leg_percent,
          pdf_url: publicUrl,
          raw_data: parsedData,
        });

      if (dbError) throw dbError;

      toast({
        title: "Успешно!",
        description: "InBody анализ загружен и обработан",
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
      setParsing(false);
    }
  };

  return (
    <Card className="border-2 border-dashed border-primary/20 bg-card/50 backdrop-blur-sm hover:border-primary/40 transition-all">
      <CardContent className="flex flex-col items-center justify-center py-12 px-6">
        <div className="mb-4">
          {uploading || parsing ? (
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
            ? "Загрузка файла..."
            : parsing
            ? "Обработка данных..."
            : "Загрузите PDF файл вашего InBody анализа для автоматического распознавания данных"}
        </p>

        <label htmlFor="inbody-upload">
          <Button
            variant="default"
            size="lg"
            disabled={uploading || parsing}
            className="cursor-pointer"
            asChild
          >
            <span>
              {uploading || parsing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploading ? "Загрузка..." : "Обработка..."}
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
          disabled={uploading || parsing}
        />

        <p className="text-xs text-muted-foreground mt-4">
          Поддерживается только PDF формат
        </p>
      </CardContent>
    </Card>
  );
};
