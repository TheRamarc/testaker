import { readFile } from '@tauri-apps/plugin-fs';
import { revokeObjectUrls } from './pdfRenderer';

function getImageMimeType(path: string) {
  const extension = path.split('.').pop()?.toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'webp') return 'image/webp';
  return 'image/png';
}

export async function createImageObjectUrl(path: string) {
  const imageBytes = await readFile(path);
  return URL.createObjectURL(new Blob([imageBytes], { type: getImageMimeType(path) }));
}

export { revokeObjectUrls };
