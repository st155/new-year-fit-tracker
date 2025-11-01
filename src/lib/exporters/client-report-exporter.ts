/**
 * Client Report PDF Exporter
 * Generates comprehensive PDF reports for trainer clients
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Goal {
  id: string;
  goal_name: string;
  target_value: number;
  current_value?: number;
  target_unit: string;
  progress_percentage?: number;
  target_date?: string;
}

interface HealthMetric {
  metric_name: string;
  value: number;
  measurement_date: string;
  unit: string;
  source: string;
}

interface WhoopSummary {
  avgRecovery: number;
  avgStrain: number;
  avgSleep: number;
  avgHRV: number;
  totalWorkouts: number;
}

interface OuraSummary {
  avgReadiness: number;
  avgSleep: number;
  avgActivity: number;
  avgHRV: number;
  totalWorkouts: number;
}

interface TrainerNote {
  content: string;
  created_at: string;
}

export interface ClientReportData {
  client: {
    full_name: string;
    username: string;
    avatar_url?: string;
  };
  period: {
    start: Date;
    end: Date;
  };
  goals: Goal[];
  healthMetrics: HealthMetric[];
  whoopSummary?: WhoopSummary;
  ouraSummary?: OuraSummary;
  trainerNotes?: TrainerNote[];
  sections: {
    includeGoals: boolean;
    includeHealth: boolean;
    includeWhoop: boolean;
    includeOura: boolean;
    includeNotes: boolean;
  };
}

export async function generateClientReport(data: ClientReportData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const primaryColor = rgb(0.4, 0.6, 1);
  const successColor = rgb(0.2, 0.8, 0.4);
  const warningColor = rgb(1, 0.7, 0.2);
  const dangerColor = rgb(0.9, 0.3, 0.3);
  const textColor = rgb(0.2, 0.2, 0.2);
  const grayColor = rgb(0.5, 0.5, 0.5);

  // Cover Page
  const coverPage = pdfDoc.addPage([595, 842]);
  let y = 700;

  coverPage.drawText('Отчет о прогрессе', {
    x: 50,
    y: y,
    size: 32,
    font: boldFont,
    color: primaryColor,
  });

  y -= 60;

  coverPage.drawText(data.client.full_name, {
    x: 50,
    y: y,
    size: 24,
    font: boldFont,
    color: textColor,
  });

  y -= 30;

  const periodText = `${format(data.period.start, 'd MMMM yyyy', { locale: ru })} - ${format(data.period.end, 'd MMMM yyyy', { locale: ru })}`;
  coverPage.drawText(periodText, {
    x: 50,
    y: y,
    size: 14,
    font: font,
    color: grayColor,
  });

  y -= 100;

  // Summary Stats
  const summaryStats = [
    { label: 'Целей', value: data.goals.length.toString() },
    { label: 'Метрик', value: data.healthMetrics.length.toString() },
    { label: 'Заметок', value: (data.trainerNotes?.length || 0).toString() },
  ];

  summaryStats.forEach((stat, index) => {
    const boxX = 50 + index * 160;
    const boxY = y - 80;

    coverPage.drawRectangle({
      x: boxX,
      y: boxY,
      width: 140,
      height: 80,
      borderColor: primaryColor,
      borderWidth: 2,
    });

    coverPage.drawText(stat.value, {
      x: boxX + 20,
      y: boxY + 45,
      size: 28,
      font: boldFont,
      color: successColor,
    });

    coverPage.drawText(stat.label, {
      x: boxX + 20,
      y: boxY + 20,
      size: 12,
      font: font,
      color: textColor,
    });
  });

  // Goals Page
  if (data.sections.includeGoals && data.goals.length > 0) {
    const goalsPage = pdfDoc.addPage([595, 842]);
    let goalY = 750;

    goalsPage.drawText('Цели и прогресс', {
      x: 50,
      y: goalY,
      size: 24,
      font: boldFont,
      color: primaryColor,
    });

    goalY -= 50;

    data.goals.forEach((goal, index) => {
      if (goalY < 100) {
        const newPage = pdfDoc.addPage([595, 842]);
        goalY = 750;
      }

      const progress = goal.progress_percentage || 0;
      const progressColor = progress >= 75 ? successColor : progress >= 50 ? warningColor : dangerColor;

      // Goal name
      goalsPage.drawText(`${index + 1}. ${goal.goal_name}`, {
        x: 50,
        y: goalY,
        size: 14,
        font: boldFont,
        color: textColor,
      });

      goalY -= 25;

      // Progress bar background
      goalsPage.drawRectangle({
        x: 50,
        y: goalY - 15,
        width: 400,
        height: 20,
        color: rgb(0.95, 0.95, 0.95),
      });

      // Progress bar fill
      goalsPage.drawRectangle({
        x: 50,
        y: goalY - 15,
        width: 400 * (progress / 100),
        height: 20,
        color: progressColor,
      });

      // Progress text
      goalsPage.drawText(`${Math.round(progress)}%`, {
        x: 460,
        y: goalY - 10,
        size: 12,
        font: boldFont,
        color: progressColor,
      });

      goalY -= 30;

      // Current vs Target
      const currentText = `Текущее: ${goal.current_value?.toFixed(1) || '—'} ${goal.target_unit}`;
      const targetText = `Цель: ${goal.target_value.toFixed(1)} ${goal.target_unit}`;

      goalsPage.drawText(currentText, {
        x: 70,
        y: goalY,
        size: 11,
        font: font,
        color: grayColor,
      });

      goalsPage.drawText(targetText, {
        x: 250,
        y: goalY,
        size: 11,
        font: font,
        color: grayColor,
      });

      goalY -= 40;
    });
  }

  // Health Metrics Page
  if (data.sections.includeHealth && data.healthMetrics.length > 0) {
    const healthPage = pdfDoc.addPage([595, 842]);
    let healthY = 750;

    healthPage.drawText('Метрики здоровья', {
      x: 50,
      y: healthY,
      size: 24,
      font: boldFont,
      color: primaryColor,
    });

    healthY -= 50;

    // Group metrics by name and calculate averages
    const metricGroups = data.healthMetrics.reduce((acc, metric) => {
      if (!acc[metric.metric_name]) {
        acc[metric.metric_name] = { values: [], unit: metric.unit, source: metric.source };
      }
      acc[metric.metric_name].values.push(metric.value);
      return acc;
    }, {} as Record<string, { values: number[]; unit: string; source: string }>);

    Object.entries(metricGroups).forEach(([name, data]) => {
      if (healthY < 100) {
        const newPage = pdfDoc.addPage([595, 842]);
        healthY = 750;
      }

      const avg = data.values.reduce((sum, v) => sum + v, 0) / data.values.length;
      const min = Math.min(...data.values);
      const max = Math.max(...data.values);

      healthPage.drawText(name, {
        x: 50,
        y: healthY,
        size: 13,
        font: boldFont,
        color: textColor,
      });

      healthPage.drawText(`Среднее: ${avg.toFixed(1)} ${data.unit}`, {
        x: 250,
        y: healthY,
        size: 12,
        font: font,
        color: textColor,
      });

      healthY -= 20;

      healthPage.drawText(`Мин: ${min.toFixed(1)} | Макс: ${max.toFixed(1)} | Источник: ${data.source}`, {
        x: 70,
        y: healthY,
        size: 10,
        font: font,
        color: grayColor,
      });

      healthY -= 30;
    });
  }

  // Whoop Summary Page
  if (data.sections.includeWhoop && data.whoopSummary) {
    const whoopPage = pdfDoc.addPage([595, 842]);
    let whoopY = 750;

    whoopPage.drawText('Whoop Данные', {
      x: 50,
      y: whoopY,
      size: 24,
      font: boldFont,
      color: primaryColor,
    });

    whoopY -= 50;

    const whoopStats = [
      { label: 'Среднее восстановление', value: `${data.whoopSummary.avgRecovery.toFixed(0)}%`, color: getHealthColor(data.whoopSummary.avgRecovery, successColor, warningColor, dangerColor) },
      { label: 'Средняя нагрузка', value: data.whoopSummary.avgStrain.toFixed(1), color: successColor },
      { label: 'Средний сон', value: `${data.whoopSummary.avgSleep.toFixed(1)} ч`, color: successColor },
      { label: 'Среднее HRV', value: data.whoopSummary.avgHRV.toFixed(0), color: successColor },
      { label: 'Всего тренировок', value: data.whoopSummary.totalWorkouts.toString(), color: primaryColor },
    ];

    whoopStats.forEach((stat) => {
      whoopPage.drawText(`${stat.label}:`, {
        x: 50,
        y: whoopY,
        size: 13,
        font: font,
        color: textColor,
      });

      whoopPage.drawText(stat.value, {
        x: 300,
        y: whoopY,
        size: 13,
        font: boldFont,
        color: stat.color,
      });

      whoopY -= 30;
    });
  }

  // Oura Summary Page
  if (data.sections.includeOura && data.ouraSummary) {
    const ouraPage = pdfDoc.addPage([595, 842]);
    let ouraY = 750;

    ouraPage.drawText('Oura Данные', {
      x: 50,
      y: ouraY,
      size: 24,
      font: boldFont,
      color: primaryColor,
    });

    ouraY -= 50;

    const ouraStats = [
      { label: 'Средняя готовность', value: `${data.ouraSummary.avgReadiness.toFixed(0)}%`, color: getHealthColor(data.ouraSummary.avgReadiness, successColor, warningColor, dangerColor) },
      { label: 'Средний сон', value: `${data.ouraSummary.avgSleep.toFixed(1)} ч`, color: successColor },
      { label: 'Средняя активность', value: data.ouraSummary.avgActivity.toFixed(0), color: successColor },
      { label: 'Среднее HRV', value: data.ouraSummary.avgHRV.toFixed(0), color: successColor },
      { label: 'Всего тренировок', value: data.ouraSummary.totalWorkouts.toString(), color: primaryColor },
    ];

    ouraStats.forEach((stat) => {
      ouraPage.drawText(`${stat.label}:`, {
        x: 50,
        y: ouraY,
        size: 13,
        font: font,
        color: textColor,
      });

      ouraPage.drawText(stat.value, {
        x: 300,
        y: ouraY,
        size: 13,
        font: boldFont,
        color: stat.color,
      });

      ouraY -= 30;
    });
  }

  // Trainer Notes Page
  if (data.sections.includeNotes && data.trainerNotes && data.trainerNotes.length > 0) {
    const notesPage = pdfDoc.addPage([595, 842]);
    let notesY = 750;

    notesPage.drawText('Заметки тренера', {
      x: 50,
      y: notesY,
      size: 24,
      font: boldFont,
      color: primaryColor,
    });

    notesY -= 50;

    data.trainerNotes.forEach((note) => {
      if (notesY < 150) {
        const newPage = pdfDoc.addPage([595, 842]);
        notesY = 750;
      }

      const dateText = format(new Date(note.created_at), 'd MMMM yyyy', { locale: ru });
      
      notesPage.drawText(dateText, {
        x: 50,
        y: notesY,
        size: 11,
        font: boldFont,
        color: grayColor,
      });

      notesY -= 20;

      const lines = wrapText(note.content, 80);
      lines.forEach((line) => {
        if (notesY < 100) return;
        
        notesPage.drawText(line, {
          x: 50,
          y: notesY,
          size: 11,
          font: font,
          color: textColor,
        });

        notesY -= 18;
      });

      notesY -= 20;
    });
  }

  // Footer on all pages
  const pages = pdfDoc.getPages();
  pages.forEach((page, index) => {
    page.drawText(`Страница ${index + 1} из ${pages.length}`, {
      x: 50,
      y: 30,
      size: 10,
      font: font,
      color: grayColor,
    });

    page.drawText(`Создано: ${format(new Date(), 'd MMMM yyyy, HH:mm', { locale: ru })}`, {
      x: 400,
      y: 30,
      size: 10,
      font: font,
      color: grayColor,
    });
  });

  return await pdfDoc.save();
}

function getHealthColor(value: number, good: any, medium: any, bad: any) {
  if (value >= 75) return good;
  if (value >= 50) return medium;
  return bad;
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + word).length <= maxChars) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines;
}
