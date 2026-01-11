import { supabase } from "@/integrations/supabase/client";
import i18n from '@/i18n';

export async function switchActivePlan(
  userId: string,
  newActivePlanId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Step 1: Deactivate all active plans for this user
    const { error: deactivateError } = await supabase
      .from('assigned_training_plans')
      .update({ status: 'inactive' })
      .eq('client_id', userId)
      .eq('status', 'active');

    if (deactivateError) {
      console.error('[switchActivePlan] Error deactivating plans:', deactivateError);
      throw deactivateError;
    }

    // Step 2: Activate the selected plan
    const { error: activateError } = await supabase
      .from('assigned_training_plans')
      .update({ status: 'active' })
      .eq('id', newActivePlanId)
      .eq('client_id', userId);

    if (activateError) {
      console.error('[switchActivePlan] Error activating plan:', activateError);
      throw activateError;
    }

    console.log('[switchActivePlan] Successfully switched to plan:', newActivePlanId);
    return { success: true };
  } catch (error: any) {
    console.error('[switchActivePlan] Unexpected error:', error);
    return { 
      success: false, 
      error: error.message || i18n.t('trainingPlan:errors.switchFailed') 
    };
  }
}
