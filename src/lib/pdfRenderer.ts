import { readFile } from '@tauri-apps/plugin-fs';

export function revokeObjectUrls(urls: string[]) {
  for (const url of urls) {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
}

export async function renderPdfPages(pdfPath: string, scale: number = 1.6) {
  const [{ GlobalWorkerOptions, getDocument }, { default: pdfWorkerSrc }] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.mjs?url')
  ]);

  GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

  const pdfBytes = await readFile(pdfPath);
  const pdf = await getDocument({ data: pdfBytes }).promise;
  const renderedPages: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Could not create canvas context for PDF rendering');
      }

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      await page.render({ canvas, canvasContext: context, viewport }).promise;

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(result => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error('Could not render PDF page image'));
          }
        }, 'image/png');
      });

      renderedPages.push(URL.createObjectURL(blob));
    }
  } catch (error) {
    revokeObjectUrls(renderedPages);
    throw error;
  }

  return renderedPages;
}
