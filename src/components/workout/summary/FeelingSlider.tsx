import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";

interface FeelingSliderProps {
  value: number;
  onChange: (value: number) => void;
}

const feelings = [
  { emoji: "😊", label: "Очень легко", range: [1, 2] },
  { emoji: "😐", label: "Нормально", range: [3] },
  { emoji: "😫", label: "Очень тяжело", range: [4, 5] },
];

export function FeelingSlider({ value, onChange }: FeelingSliderProps) {
  const currentFeeling = feelings.find(f => 
    value >= f.range[0] && value <= f.range[f.range.length - 1]
  ) || feelings[1];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-6"
    >
      <div className="text-center space-y-1">
        <h3 className="text-2xl font-semibold text-foreground">
          Как ты себя чувствуешь?
        </h3>
        <p className="text-muted-foreground">после тренировки?</p>
      </div>

      <div className="flex justify-center">
        <motion.div
          key={currentFeeling.emoji}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="text-6xl"
        >
          {currentFeeling.emoji}
        </motion.div>
      </div>

      <div className="space-y-4">
        <Slider
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          min={1}
          max={5}
          step={1}
          className="w-full"
        />
        
        <div className="flex justify-between text-sm text-muted-foreground px-1">
          <span>Легко</span>
          <span className="font-semibold text-foreground">{currentFeeling.label}</span>
          <span>Тяжело</span>
        </div>
      </div>
    </motion.div>
  );
}
