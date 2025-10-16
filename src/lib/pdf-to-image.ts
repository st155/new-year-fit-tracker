/**
 * PDF to Image converter utility
 * Isolated from React components to avoid module resolution issues
 */

let pdfjsLib: any = null;

async function loadPdfJs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
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

export async function convertPdfToImages(
  pdfUrl: string,
  options?: {
    fetchTimeoutMs?: number;
    scale?: number;
    onProgress?: (current: number, total: number) => void;
  }
): Promise<string[]> {
  const pdfjs = await loadPdfJs();
  
  const fetchTimeoutMs = options?.fetchTimeoutMs ?? 90000; // default 90s
  const renderScale = options?.scale ?? 2.0;

  console.log('Fetching PDF from:', pdfUrl.substring(0, 100) + '...');
  
  // Fetch PDF with timeout
  const controller = new AbortController();
  const fetchTimeout = setTimeout(() => controller.abort(), fetchTimeoutMs);
  
  let pdf: any;
  
  try {
    const response = await fetch(pdfUrl, { signal: controller.signal });
    clearTimeout(fetchTimeout);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
    }
    
    console.log('PDF fetched, converting to blob...');
    const pdfBlob = await response.blob();
    console.log('PDF blob size:', (pdfBlob.size / 1024 / 1024).toFixed(2), 'MB');
    
    const arrayBuffer = await pdfBlob.arrayBuffer();
    console.log('Loading PDF document...');
    pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    console.log('PDF loaded, pages:', pdf.numPages);
  } catch (error) {
    clearTimeout(fetchTimeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Превышено время загрузки PDF (${Math.round(fetchTimeoutMs/1000)} секунд)`);
    }
    throw error;
  }
  
  const numPages = Math.min(pdf.numPages, 2); // Only first 2 pages
  const images: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    console.log(`Rendering page ${i}/${numPages}...`);
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: renderScale });

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

    // Progress callback and yield to UI
    options?.onProgress?.(i, numPages);
    await new Promise((r) => setTimeout(r, 0));
  }

  return images;
}
