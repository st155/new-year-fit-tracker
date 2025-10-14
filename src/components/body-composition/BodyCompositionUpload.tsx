import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const bodyCompositionSchema = z.object({
  weight: z.string().min(1, "Weight is required"),
  body_fat_percentage: z.string().min(1, "Body fat % is required"),
  muscle_mass: z.string().min(1, "Muscle mass is required"),
  measurement_date: z.string().min(1, "Date is required"),
  bone_mass: z.string().optional(),
  water_percentage: z.string().optional(),
  protein_percentage: z.string().optional(),
  visceral_fat: z.string().optional(),
  bmr: z.string().optional(),
  metabolic_age: z.string().optional(),
});

type BodyCompositionForm = z.infer<typeof bodyCompositionSchema>;

interface BodyCompositionUploadProps {
  onSuccess?: () => void;
}

export function BodyCompositionUpload({ onSuccess }: BodyCompositionUploadProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BodyCompositionForm>({
    resolver: zodResolver(bodyCompositionSchema),
    defaultValues: {
      measurement_date: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = async (values: BodyCompositionForm) => {
    setIsSubmitting(true);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        toast.error("Please login to add measurements");
        return;
      }

      const { error } = await supabase.from('body_composition').insert({
        user_id: session.session.user.id,
        weight: parseFloat(values.weight),
        body_fat_percentage: parseFloat(values.body_fat_percentage),
        muscle_mass: parseFloat(values.muscle_mass),
        measurement_date: values.measurement_date,
        measurement_method: 'manual',
      });

      if (error) throw error;

      toast.success("Body composition data added successfully!");
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error saving body composition:', error);
      toast.error("Failed to save data");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="measurement_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Measurement Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weight (kg)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" placeholder="70.5" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="body_fat_percentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Body Fat (%)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" placeholder="15.5" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="muscle_mass"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Muscle Mass (kg)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" placeholder="55.0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Сохранить измерение
        </Button>
      </form>
    </Form>
  );
}
