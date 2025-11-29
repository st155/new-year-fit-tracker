import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Camera, Pill } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { ProductPhotoUploader } from './ProductPhotoUploader';

interface EditProtocolItemDialogProps {
  item: any;
  open: boolean;
  onClose: () => void;
}

const INTAKE_TIMES = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'before_sleep', label: 'Before Sleep' },
];

const DOSAGE_UNITS = ['mg', 'g', 'mcg', 'IU', 'ml', 'drops', 'serving'];

export function EditProtocolItemDialog({ item, open, onClose }: EditProtocolItemDialogProps) {
  const [dailyDosage, setDailyDosage] = useState(item.daily_dosage?.toString() || '1');
  const [dosageUnit, setDosageUnit] = useState(item.dosage_unit || 'mg');
  const [intakeTimes, setIntakeTimes] = useState<string[]>(item.intake_times || []);
  const [isPhotoUploaderOpen, setIsPhotoUploaderOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const toggleIntakeTime = (time: string) => {
    setIntakeTimes(prev =>
      prev.includes(time)
        ? prev.filter(t => t !== time)
        : [...prev, time]
    );
  };

  const updateItemMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('protocol_items')
        .update({
          daily_dosage: parseFloat(dailyDosage) || 1,
          dosage_unit: dosageUnit,
          intake_times: intakeTimes,
        })
        .eq('id', item.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-protocols'] });
      queryClient.invalidateQueries({ queryKey: ['todays-supplements'] });
      toast({
        title: '✅ Supplement updated',
        description: 'Dosage and intake times have been saved.',
      });
      onClose();
    },
    onError: (error) => {
      console.error('Update item error:', error);
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Failed to update supplement',
        variant: 'destructive',
      });
    },
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-lg bg-neutral-950 border-yellow-500/30">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Edit: {item.supplement_products?.name || 'Supplement'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Product Photo */}
            <div className="flex justify-center">
              <div className="w-32 h-32 rounded-lg overflow-hidden bg-neutral-800 relative group">
                {item.supplement_products?.image_url ? (
                  <img 
                    src={item.supplement_products.image_url} 
                    alt={item.supplement_products.name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <>
                    <div className="w-full h-full flex items-center justify-center bg-green-500/10">
                      <Pill className="h-12 w-12 text-green-500/50" />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setIsPhotoUploaderOpen(true)}
                      className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-2 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-0"
                    >
                      <Camera className="h-6 w-6 text-white" />
                      <span className="text-xs text-white">Add Photo</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          {/* Dosage */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="dosage">Daily Dosage</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="dosage"
                  type="number"
                  value={dailyDosage}
                  onChange={(e) => setDailyDosage(e.target.value)}
                  placeholder="1"
                  min="0.1"
                  step="0.1"
                  className="flex-1"
                />
                <select
                  value={dosageUnit}
                  onChange={(e) => setDosageUnit(e.target.value)}
                  className="px-3 py-2 rounded-md border border-input bg-background text-sm"
                >
                  {DOSAGE_UNITS.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Intake Times */}
          <div className="space-y-3">
            <Label>Intake Times</Label>
            <div className="space-y-2">
              {INTAKE_TIMES.map(time => (
                <div key={time.value} className="flex items-center gap-2">
                  <Checkbox
                    id={time.value}
                    checked={intakeTimes.includes(time.value)}
                    onCheckedChange={() => toggleIntakeTime(time.value)}
                  />
                  <Label
                    htmlFor={time.value}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {time.label}
                  </Label>
                </div>
              ))}
            </div>
            {intakeTimes.length === 0 && (
              <p className="text-xs text-red-500">
                ⚠️ Select at least one intake time
              </p>
            )}
          </div>

          {/* Save Button */}
          <Button
            onClick={() => updateItemMutation.mutate()}
            disabled={updateItemMutation.isPending || intakeTimes.length === 0}
            className="w-full bg-green-500 hover:bg-green-600"
          >
            <Save className="h-4 w-4 mr-2" />
          {updateItemMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </DialogContent>
  </Dialog>

  {/* Photo Uploader */}
  <ProductPhotoUploader
    isOpen={isPhotoUploaderOpen}
    onClose={() => setIsPhotoUploaderOpen(false)}
    productId={item.product_id}
    productName={item.supplement_products?.name || 'Supplement'}
  />
  </>
  );
}
