/**
 * PDF to Image converter utility
 * Isolated from React components to avoid module resolution issues
 */

let pdfjsLib: any = null;

async function loadPdfJs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }
  return pdfjsLib;
}

export async function convertPdfToImage(pdfBlob: Blob): Promise<Blob> {
  const pdfjs = await loadPdfJs();
  
  const arrayBuffer = await pdfBlob.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  const scale = 2.0; // High quality for better OCR
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) {
    throw new Error('Canvas 2D context unavailable');
  }

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create image blob from canvas'));
      }
    }, 'image/jpeg', 0.85);
  });
}

export async function convertPdfToImages(pdfUrl: string): Promise<string[]> {
  const pdfjs = await loadPdfJs();
  
  // Fetch PDF
  const response = await fetch(pdfUrl);
  const pdfBlob = await response.blob();
  const arrayBuffer = await pdfBlob.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  
  const numPages = Math.min(pdf.numPages, 2); // Only first 2 pages
  const images: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const scale = 2.0;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Canvas 2D context unavailable');
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    // Convert to base64
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    images.push(dataUrl);
  }

  return images;
}
