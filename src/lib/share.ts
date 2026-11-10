/**
 * Native share sheet helpers, with web guards.
 */
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { isCancelled, ToolError, toToolError } from './errors';

export async function isSharingAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return await Sharing.isAvailableAsync();
  } catch {
    return false;
  }
}

export type ShareOptions = {
  mimeType?: string;
  UTI?: string;
  dialogTitle?: string;
};

export async function shareFile(uri: string, options: ShareOptions = {}): Promise<void> {
  if (Platform.OS === 'web') {
    throw new ToolError('share', 'Sharing files is not available in the browser.');
  }
  try {
    await Sharing.shareAsync(uri, options);
  } catch (error) {
    if (isCancelled(error)) throw new ToolError('cancelled', 'Cancelled.', error);
    throw toToolError(error, 'share');
  }
}

export function sharePdf(uri: string, dialogTitle = 'Share PDF'): Promise<void> {
  return shareFile(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle,
  });
}

export function shareImage(uri: string, dialogTitle = 'Share image'): Promise<void> {
  return shareFile(uri, {
    mimeType: 'image/png',
    UTI: 'public.png',
    dialogTitle,
  });
}
