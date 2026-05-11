import { open } from '@tauri-apps/plugin-dialog';
import { copyFile, mkdir, exists, BaseDirectory } from '@tauri-apps/plugin-fs';
import { join, homeDir } from '@tauri-apps/api/path';

async function ensureUploadDir() {
  const uploadDirName = 'tnpsc_uploads';
  const dirExists = await exists(uploadDirName, { baseDir: BaseDirectory.Home });
  if (!dirExists) {
    await mkdir(uploadDirName, { baseDir: BaseDirectory.Home });
  }
  return uploadDirName;
}

export async function pickAndSavePdf(): Promise<string | null> {
  try {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    if (!selected || Array.isArray(selected)) return null;

    const uploadDirName = await ensureUploadDir();
    const fileName = `pdf_${Date.now()}.pdf`;
    const destinationSubPath = await join(uploadDirName, fileName);

    await copyFile(selected, destinationSubPath, { toPathBaseDir: BaseDirectory.Home });

    const home = await homeDir();
    return await join(home, destinationSubPath);
  } catch (error) {
    console.error('Failed to save PDF:', error);
    alert('PDF Upload failed: ' + error);
    return null;
  }
}
