import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ParsedSupplement {
  supplement_name: string;
  dosage_amount: number;
  dosage_unit: string;
  intake_times: string[];
  timing_notes?: string;
  form?: string;
  brand?: string;
  photo_url?: string;
  product_id?: string;
}

export function useProtocolMessageParser() {
  return useMutation({
    mutationFn: async (messageText: string) => {
      const { data, error } = await supabase.functions.invoke(
        'parse-protocol-message',
        { body: { message: messageText } }
      );
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to parse protocol');
      
      return data.supplements as ParsedSupplement[];
    }
  });
}