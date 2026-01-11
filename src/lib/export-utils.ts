// Утилиты для экспорта данных
import { getIntlLocale } from '@/lib/date-locale';

interface ExportData {
  headers: string[];
  rows: any[][];
}

/**
 * Конвертирует данные в CSV формат
 */
export const exportToCSV = (data: ExportData, filename: string) => {
  const csvContent = [
    data.headers.join(','),
    ...data.rows.map(row => 
      row.map(cell => {
        // Экранируем запятые и кавычки
        const cellStr = String(cell ?? '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    )
  ].join('\n');

  // Добавляем BOM для корректной работы с кириллицей в Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, `${filename}.csv`);
};

/**
 * Конвертирует данные в PDF формат (через HTML)
 */
export const exportToPDF = (data: ExportData, filename: string, title: string) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          color: #333;
        }
        h1 {
          color: #2563eb;
          margin-bottom: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        th {
          background-color: #2563eb;
          color: white;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f9fafb;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #6b7280;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <table>
        <thead>
          <tr>
            ${data.headers.map(h => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.rows.map(row => `
            <tr>
              ${row.map(cell => `<td>${cell ?? ''}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="footer">
        <p>Exported: ${new Date().toLocaleString(getIntlLocale())}</p>
      </div>
    </body>
    </html>
  `;

  // Создаем новое окно для печати
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Ждем загрузки и запускаем печать
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      // Закрываем окно после печати (пользователь может сохранить как PDF)
      setTimeout(() => printWindow.close(), 100);
    };
  }
};

/**
 * Скачивает файл
 */
const downloadFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Форматирует дату для экспорта
 */
export const formatDateForExport = (date: string | Date | null): string => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString(getIntlLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Форматирует число для экспорта
 */
export const formatNumberForExport = (value: number | null | undefined, decimals: number = 1): string => {
  if (value === null || value === undefined) return '';
  return value.toFixed(decimals);
};
