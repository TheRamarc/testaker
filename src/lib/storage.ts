import { open } from '@tauri-apps/plugin-dialog';
import { copyFile, mkdir, exists, BaseDirectory } from '@tauri-apps/plugin-fs';
import { join, homeDir } from '@tauri-apps/api/path';

export interface SavedPdf {
  savedPath: string;
  originalName: string;
}

export interface SavedImage {
  savedPath: string;
  originalName: string;
}

async function ensureUploadDir() {
  const uploadDirName = 'tnpsc_uploads';
  const dirExists = await exists(uploadDirName, { baseDir: BaseDirectory.Home });
  if (!dirExists) {
    await mkdir(uploadDirName, { baseDir: BaseDirectory.Home });
  }
  return uploadDirName;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function pickAndSavePdf(): Promise<SavedPdf | null> {
  try {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    if (!selected || Array.isArray(selected)) return null;

    const uploadDirName = await ensureUploadDir();
    const originalName = selected.split(/[/\\]/).pop() || 'document.pdf';
    const fileName = `${Date.now()}_${sanitizeFileName(originalName)}`;
    const destinationSubPath = await join(uploadDirName, fileName);

    await copyFile(selected, destinationSubPath, { toPathBaseDir: BaseDirectory.Home });

    const home = await homeDir();
    return {
      savedPath: await join(home, destinationSubPath),
      originalName
    };
  } catch (error) {
    console.error('Failed to save PDF:', error);
    alert('PDF Upload failed: ' + error);
    return null;
  }
}

export async function pickAndSaveImages(): Promise<SavedImage[]> {
  try {
    const selected = await open({
      multiple: true,
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
    });

    if (!selected) return [];

    const selectedPaths = Array.isArray(selected) ? selected : [selected];
    const uploadDirName = await ensureUploadDir();
    const home = await homeDir();
    const savedImages: SavedImage[] = [];

    for (const sourcePath of selectedPaths) {
      const originalName = sourcePath.split(/[/\\]/).pop() || 'question-image';
      const fileName = `${Date.now()}_${savedImages.length}_${sanitizeFileName(originalName)}`;
      const destinationSubPath = await join(uploadDirName, fileName);

      await copyFile(sourcePath, destinationSubPath, { toPathBaseDir: BaseDirectory.Home });
      savedImages.push({
        savedPath: await join(home, destinationSubPath),
        originalName
      });
    }

    return savedImages;
  } catch (error) {
    console.error('Failed to save images:', error);
    alert('Image upload failed: ' + error);
    return [];
  }
}
