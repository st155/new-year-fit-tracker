import { useState, useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RotateCcw, Calendar } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface TimelinePoint {
  date: Date;
  label: string;
  isInBody: boolean;
}

interface BodyModelTimelineProps {
  inbodyDates: Date[];
  onDateChange: (date: Date) => void;
  currentDate?: Date;
}

export function BodyModelTimeline({
  inbodyDates,
  onDateChange,
  currentDate,
}: BodyModelTimelineProps) {
  const sortedDates = useMemo(() => 
    [...inbodyDates].sort((a, b) => a.getTime() - b.getTime()),
    [inbodyDates]
  );

  // Create timeline from first InBody to today
  const firstDate = sortedDates[0] || new Date();
  const lastDate = new Date();
  const totalDays = differenceInDays(lastDate, firstDate);

  const [sliderValue, setSliderValue] = useState([totalDays]);

  // Calculate which date corresponds to slider position
  const selectedDate = useMemo(() => {
    const daysFromStart = sliderValue[0];
    const date = new Date(firstDate);
    date.setDate(date.getDate() + daysFromStart);
    return date;
  }, [sliderValue, firstDate]);

  // Handle slider change
  const handleSliderChange = (value: number[]) => {
    setSliderValue(value);
    const daysFromStart = value[0];
    const newDate = new Date(firstDate);
    newDate.setDate(newDate.getDate() + daysFromStart);
    onDateChange(newDate);
  };

  // Reset to current date
  const handleReset = () => {
    setSliderValue([totalDays]);
    onDateChange(lastDate);
  };

  // Check if current slider position is on an InBody date
  const isOnInBodyPoint = sortedDates.some(date => 
    Math.abs(differenceInDays(date, selectedDate)) === 0
  );

  if (sortedDates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 p-4 rounded-lg border border-border/50 bg-card/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Body Composition Timeline</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleReset}
          className="h-8"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset
        </Button>
      </div>

      {/* Selected date display */}
      <div className="flex items-center justify-center gap-2">
        <div className={`text-center px-4 py-2 rounded-lg ${
          isOnInBodyPoint 
            ? 'bg-primary/20 border border-primary/50' 
            : 'bg-muted/50'
        }`}>
          <p className="text-xs text-muted-foreground">Selected Date</p>
          <p className="text-lg font-bold">
            {format(selectedDate, 'MMM dd, yyyy')}
          </p>
          {isOnInBodyPoint && (
            <p className="text-xs text-primary font-semibold mt-1">
              📊 InBody Scan
            </p>
          )}
        </div>
      </div>

      {/* Slider */}
      <div className="relative px-2">
        <Slider
          value={sliderValue}
          onValueChange={handleSliderChange}
          max={totalDays}
          step={1}
          className="w-full"
        />
        
        {/* InBody markers */}
        <div className="absolute top-0 left-0 right-0 h-full pointer-events-none">
          {sortedDates.map((date, index) => {
            const daysFromStart = differenceInDays(date, firstDate);
            const position = (daysFromStart / totalDays) * 100;
            
            return (
              <div
                key={index}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                style={{ left: `${position}%` }}
              >
                <div className="w-3 h-3 rounded-full bg-primary border-2 border-background shadow-lg" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Date range labels */}
      <div className="flex justify-between text-xs text-muted-foreground px-2">
        <span>{format(firstDate, 'MMM d')}</span>
        <span className="text-primary">
          {sortedDates.length} InBody scan{sortedDates.length !== 1 ? 's' : ''}
        </span>
        <span>{format(lastDate, 'MMM d')}</span>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/50">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span>InBody Data</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-muted" />
          <span>Estimated</span>
        </div>
      </div>
    </div>
  );
}
