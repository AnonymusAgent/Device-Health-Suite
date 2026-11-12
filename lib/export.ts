import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Browser downloads and native file sharing, with failures surfaced to the caller. */
export async function exportText(filename: string, contents: string, mime = 'text/plain'): Promise<'downloaded' | 'shared' | 'cancelled'> {
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) throw new Error('Invalid export filename.');
  if (Platform.OS === 'web') {
    if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') throw new Error('Downloads are not available in this runtime.');
    const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename; link.style.display = 'none';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return 'downloaded';
  }
  if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is not available on this device.');
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true, intermediates: true });
  file.write(contents);
  try {
    await Sharing.shareAsync(file.uri, { mimeType: mime, dialogTitle: 'Export from Veylo', UTI: mime === 'application/json' ? 'public.json' : 'public.plain-text' });
    return 'shared';
  } finally {
    try { if (file.exists) file.delete(); } catch { /* The OS may already have removed the temporary export. */ }
  }
}
export function exportDate(): string { return new Date().toISOString().slice(0, 10); }
