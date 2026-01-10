/**
 * PDF Export for Habit Data
 * Uses pdf-lib to create beautiful habit reports
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import i18n from '@/i18n';

const getDateLocale = () => i18n.language === 'ru' ? ru : enUS;

interface HabitData {
  name: string;
  description?: string;
  stats: {
    current_streak: number;
    total_completions: number;
    completion_rate: number;
  };
  progressData: Array<{
    date: Date;
    completed: boolean;
    streak?: number;
  }>;
  longestStreak: number;
}

export async function exportHabitToPDF(habit: HabitData): Promise<void> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const primaryColor = rgb(0.4, 0.6, 1); // Blue
  const successColor = rgb(0.2, 0.8, 0.4); // Green
  const textColor = rgb(0.2, 0.2, 0.2); // Dark gray

  let currentY = height - 60;

  // Title
  page.drawText('Отчет по привычке', {
    x: 50,
    y: currentY,
    size: 28,
    font: boldFont,
    color: primaryColor,
  });

  currentY -= 50;

  // Habit Name
  page.drawText(habit.name, {
    x: 50,
    y: currentY,
    size: 20,
    font: boldFont,
    color: textColor,
  });

  currentY -= 30;

  // Description
  if (habit.description) {
    const descLines = wrapText(habit.description, 70);
    descLines.forEach(line => {
      page.drawText(line, {
        x: 50,
        y: currentY,
        size: 12,
        font: font,
        color: textColor,
      });
      currentY -= 20;
    });
  }

  currentY -= 20;

  // Stats Section
  page.drawText(i18n.t('habits:pdf.statistics'), {
    x: 50,
    y: currentY,
    size: 16,
    font: boldFont,
    color: primaryColor,
  });

  currentY -= 30;

  // Stats boxes
  const stats = [
    { label: i18n.t('habits:pdf.currentStreak'), value: `${habit.stats.current_streak} ${i18n.t('habits:pdf.days')}` },
    { label: i18n.t('habits:pdf.bestStreak'), value: `${habit.longestStreak} ${i18n.t('habits:pdf.days')}` },
    { label: i18n.t('habits:pdf.totalCompletions'), value: `${habit.stats.total_completions}` },
    { label: i18n.t('habits:pdf.completionRate'), value: `${Math.round(habit.stats.completion_rate)}%` },
  ];

  const boxWidth = 120;
  const boxHeight = 60;
  const spacing = 15;
  let boxX = 50;

  stats.forEach((stat, index) => {
    if (index === 2) {
      boxX = 50;
      currentY -= boxHeight + spacing;
    }

    // Draw box
    page.drawRectangle({
      x: boxX,
      y: currentY - boxHeight,
      width: boxWidth,
      height: boxHeight,
      borderColor: primaryColor,
      borderWidth: 2,
    });

    // Draw value
    page.drawText(stat.value, {
      x: boxX + 10,
      y: currentY - 25,
      size: 18,
      font: boldFont,
      color: successColor,
    });

    // Draw label
    page.drawText(stat.label, {
      x: boxX + 10,
      y: currentY - 45,
      size: 10,
      font: font,
      color: textColor,
    });

    boxX += boxWidth + spacing;
  });

  currentY -= boxHeight + 40;

  // History Section
  page.drawText(i18n.t('habits:pdf.historyTitle'), {
    x: 50,
    y: currentY,
    size: 16,
    font: boldFont,
    color: primaryColor,
  });

  currentY -= 30;

  // Display last 30 completed days
  const completedDays = habit.progressData
    .filter(d => d.completed)
    .slice(-30)
    .reverse();

  completedDays.slice(0, 20).forEach((day) => {
    const dateStr = format(day.date, 'd MMMM yyyy', { locale: getDateLocale() });
    const streakStr = day.streak && day.streak > 1 ? ` (${i18n.t('habits:pdf.streakLabel')}: ${day.streak})` : '';
    
    page.drawText(`• ${dateStr}${streakStr}`, {
      x: 60,
      y: currentY,
      size: 11,
      font: font,
      color: textColor,
    });

    currentY -= 18;

    // Prevent overflow
    if (currentY < 100) return;
  });

  // Footer
  page.drawText(`${i18n.t('habits:pdf.created')}: ${format(new Date(), 'd MMMM yyyy, HH:mm', { locale: getDateLocale() })}`, {
    x: 50,
    y: 50,
    size: 10,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Save PDF
  const pdfBytes = await pdfDoc.save();
  // Create blob from buffer (pdf-lib returns Uint8Array)
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `habit-${habit.name}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  link.click();
}

/**
 * Wrap text to fit width
 */
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
