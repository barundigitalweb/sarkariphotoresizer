/**
 * Client-Side PDF Renderer using Mozilla's PDF.js
 * Dynamically loads PDF.js only when a user uploads an existing .pdf document.
 * Renders page 1 at high resolution (up to 300 DPI) into a JPEG File.
 */

let pdfjsPromise: Promise<any> | null = null;

function loadPdfJs(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('PDF rendering is only supported in browser environments.'));
  }

  // Already loaded in window
  if ((window as any).pdfjsLib) {
    return Promise.resolve((window as any).pdfjsLib);
  }

  if (!pdfjsPromise) {
    pdfjsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.async = true;
      script.onload = () => {
        const lib = (window as any).pdfjsLib;
        if (lib) {
          lib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve(lib);
        } else {
          reject(new Error('PDF.js library failed to initialize.'));
        }
      };
      script.onerror = () => {
        pdfjsPromise = null;
        reject(new Error('Failed to load PDF engine. Please check your internet connection.'));
      };
      document.head.appendChild(script);
    });
  }

  return pdfjsPromise;
}

/**
 * Converts the first page of an uploaded PDF File into a high-quality JPEG File
 */
export async function convertPdfPageToImageFile(pdfFile: File): Promise<File> {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await pdfFile.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  if (pdf.numPages < 1) {
    throw new Error('The selected PDF file has no pages.');
  }

  const page = await pdf.getPage(1);

  // Render at sharp 2.0x to 3.0x scale (targeting ~2000-2400px longest dimension)
  const baseViewport = page.getViewport({ scale: 1.0 });
  const maxDim = Math.max(baseViewport.width, baseViewport.height);
  const targetLongDim = 2400;
  const scale = Math.max(1.8, Math.min(3.2, targetLongDim / (maxDim || 800)));
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    throw new Error('Failed to create canvas context for PDF rendering.');
  }

  // Draw pure white background in case PDF has transparent elements
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport: viewport
  }).promise;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to generate image from PDF page.'));
      },
      'image/jpeg',
      0.95
    );
  });

  const baseName = pdfFile.name.replace(/\.[^/.]+$/, '');
  return new File([blob], `${baseName}_converted.jpg`, { type: 'image/jpeg' });
}
