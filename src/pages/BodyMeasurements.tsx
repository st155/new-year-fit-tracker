import { Info, Target, Scale, Activity, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const BodyMeasurements = () => {
  // InBody данные из PDF
  const bodyData = {
    weight: { value: 75.1, range: "57.9-78.3", unit: "kg" },
    smm: { value: 36.4, range: "29.2-35.6", unit: "kg", status: "above" },
    pbf: { value: 15.5, range: "10.0-20.0", unit: "%" },
    bodyFatMass: { value: 11.6, range: "8.2-16.4", unit: "kg" },
    visceralFat: { value: 46.1, threshold: 100, unit: "cm²" },
    segmental: {
      rightArm: { value: 3.68, percent: 110.5 },
      leftArm: { value: 3.70, percent: 110.9 },
      trunk: { value: 28.4, percent: 107.0 },
      rightLeg: { value: 9.38, percent: 101.3 },
      leftLeg: { value: 9.40, percent: 101.5 },
    },
  };

  const getBalanceColor = (percent: number) => {
    if (percent >= 100 && percent <= 110) return "bg-green-500/20 border-green-500";
    if (percent >= 90 && percent < 100) return "bg-yellow-500/20 border-yellow-500";
    return "bg-red-500/20 border-red-500";
  };

  const getBalanceStatus = (percent: number) => {
    if (percent >= 100 && percent <= 110) return "Сбалансировано";
    if (percent >= 90 && percent < 100) return "Немного ниже";
    return "Требует внимания";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
            Состав Тела
          </h1>
          <p className="text-muted-foreground">
            InBody Анализ от 14.10.2025
          </p>
        </div>

        {/* SECTION 1: Core Vitals */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold">Основные Показатели</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Info className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Основные Показатели</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Это три ключевых метрики вашего состава тела. Вес показывает общую массу,
                  мышечная масса отражает силовой потенциал, а процент жира — главный
                  показатель для достижения рельефа к Новому Году!
                </p>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Weight Card */}
            <Card className="relative overflow-hidden border-primary/20 bg-card/50 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Scale className="h-5 w-5 text-primary" />
                  Вес
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-4xl font-bold text-primary">
                  {bodyData.weight.value}
                  <span className="text-lg text-muted-foreground ml-1">
                    {bodyData.weight.unit}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Норма: {bodyData.weight.range} {bodyData.weight.unit}
                </p>
              </CardContent>
            </Card>

            {/* Skeletal Muscle Mass Card */}
            <Card className="relative overflow-hidden border-green-500/30 bg-card/50 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="h-5 w-5 text-green-500" />
                  Мышечная Масса
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-end gap-2">
                  <div className="text-4xl font-bold text-green-500">
                    {bodyData.smm.value}
                    <span className="text-lg text-muted-foreground ml-1">
                      {bodyData.smm.unit}
                    </span>
                  </div>
                  <Badge variant="outline" className="border-green-500/50 text-green-500 mb-1">
                    Выше нормы
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Норма: {bodyData.smm.range} {bodyData.smm.unit}
                </p>
              </CardContent>
            </Card>

            {/* Body Fat Percentage Card */}
            <Card className="relative overflow-hidden border-orange-500/30 bg-card/50 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-orange-500" />
                  Процент Жира
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-4xl font-bold text-orange-500">
                  {bodyData.pbf.value}
                  <span className="text-lg text-muted-foreground ml-1">
                    {bodyData.pbf.unit}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Норма: {bodyData.pbf.range} {bodyData.pbf.unit}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* SECTION 2: Muscle-Fat Analysis */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold">Анализ Мышц и Жира</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Info className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Анализ Мышц и Жира</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  У вас отличное соотношение мышц к жиру: {bodyData.smm.value} кг мышц против{" "}
                  {bodyData.bodyFatMass.value} кг жира. Мышечная масса в 3+ раза больше жировой —
                  это показывает хорошую спортивную форму! Продолжайте в том же духе.
                </p>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Visual Comparison Chart */}
            <Card className="lg:col-span-2 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Соотношение Мышц и Жира</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Muscle Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Мышечная Масса</span>
                    <span className="text-green-500 font-bold">
                      {bodyData.smm.value} {bodyData.smm.unit}
                    </span>
                  </div>
                  <div className="h-8 w-full bg-secondary/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full shadow-lg shadow-green-500/50 flex items-center justify-end px-4"
                      style={{ width: "75%" }}
                    >
                      <Zap className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>

                {/* Fat Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Жировая Масса</span>
                    <span className="text-orange-500 font-bold">
                      {bodyData.bodyFatMass.value} {bodyData.bodyFatMass.unit}
                    </span>
                  </div>
                  <div className="h-8 w-full bg-secondary/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full shadow-lg shadow-orange-500/50"
                      style={{ width: "25%" }}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Норма жировой массы: {bodyData.bodyFatMass.range} {bodyData.bodyFatMass.unit}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Visceral Fat Card */}
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Висцеральный Жир</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-3xl font-bold text-primary">
                    {bodyData.visceralFat.value}
                    <span className="text-lg text-muted-foreground ml-1">
                      {bodyData.visceralFat.unit}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Норма: &lt; {bodyData.visceralFat.threshold} {bodyData.visceralFat.unit}
                  </p>
                </div>
                <Badge variant="outline" className="border-green-500/50 text-green-500">
                  ✓ Здоровый уровень
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Висцеральный жир — это жир вокруг внутренних органов. Ваш уровень в норме!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* SECTION 3: Body Balance */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold">Баланс Тела и Симметрия</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Info className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Баланс Тела</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Этот раздел показывает, как мышечная масса распределена по телу. Все ваши
                  показатели в зеленой зоне (100-110%), что означает отличную симметрию и
                  сбалансированное развитие всех групп мышц!
                </p>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Body Silhouette */}
                <div className="flex items-center justify-center">
                  <div className="relative w-64 h-96">
                    {/* Simple body representation */}
                    <svg viewBox="0 0 200 400" className="w-full h-full">
                      {/* Head */}
                      <circle cx="100" cy="30" r="25" className="fill-primary/20 stroke-primary stroke-2" />
                      
                      {/* Trunk */}
                      <rect
                        x="70"
                        y="55"
                        width="60"
                        height="120"
                        rx="10"
                        className={`${getBalanceColor(bodyData.segmental.trunk.percent)} stroke-2`}
                      />
                      
                      {/* Right Arm */}
                      <rect
                        x="130"
                        y="60"
                        width="20"
                        height="80"
                        rx="10"
                        className={`${getBalanceColor(bodyData.segmental.rightArm.percent)} stroke-2`}
                      />
                      
                      {/* Left Arm */}
                      <rect
                        x="50"
                        y="60"
                        width="20"
                        height="80"
                        rx="10"
                        className={`${getBalanceColor(bodyData.segmental.leftArm.percent)} stroke-2`}
                      />
                      
                      {/* Right Leg */}
                      <rect
                        x="105"
                        y="175"
                        width="25"
                        height="120"
                        rx="10"
                        className={`${getBalanceColor(bodyData.segmental.rightLeg.percent)} stroke-2`}
                      />
                      
                      {/* Left Leg */}
                      <rect
                        x="70"
                        y="175"
                        width="25"
                        height="120"
                        rx="10"
                        className={`${getBalanceColor(bodyData.segmental.leftLeg.percent)} stroke-2`}
                      />
                    </svg>
                  </div>
                </div>

                {/* Segmental Data */}
                <div className="space-y-4">
                  {Object.entries({
                    "Правая Рука": bodyData.segmental.rightArm,
                    "Левая Рука": bodyData.segmental.leftArm,
                    "Корпус": bodyData.segmental.trunk,
                    "Правая Нога": bodyData.segmental.rightLeg,
                    "Левая Нога": bodyData.segmental.leftLeg,
                  }).map(([name, data]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card/30"
                    >
                      <div>
                        <p className="font-medium">{name}</p>
                        <p className="text-sm text-muted-foreground">
                          {data.value} kg
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant="outline"
                          className={getBalanceColor(data.percent)}
                        >
                          {data.percent}%
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getBalanceStatus(data.percent)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Legend */}
        <Card className="bg-card/30 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 justify-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500/20 border-2 border-green-500" />
                <span>100-110% (Сбалансировано)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-500/20 border-2 border-yellow-500" />
                <span>90-100% (Немного ниже)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500/20 border-2 border-red-500" />
                <span>&lt;90% (Требует внимания)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BodyMeasurements;
