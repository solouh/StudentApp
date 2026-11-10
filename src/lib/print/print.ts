/**
 * Printing / PDF export. Everything is generated from an inlined-base64 HTML
 * document so no network or local asset URLs are needed (iOS WKWebView cannot
 * print `file://` images).
 */
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import { toToolError } from '../errors';

/** Opens the system print dialog (printer selection or "Save as PDF"). */
export async function printHtml(html: string): Promise<void> {
  try {
    await Print.printAsync({ html });
  } catch (error) {
    throw toToolError(error, 'print');
  }
}

/** Renders HTML to a PDF in the app cache and returns its file uri. */
export async function htmlToPdf(html: string, fileName: string): Promise<string> {
  let result: Print.FilePrintResult;
  try {
    result = await Print.printToFileAsync({ html });
  } catch (error) {
    throw toToolError(error, 'print');
  }

  const safeName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;

  try {
    const source = new File(result.uri);
    const target = new File(Paths.cache, safeName);
    if (target.exists) target.delete();
    source.move(target);
    return source.uri;
  } catch {
    // Renaming is cosmetic; a random cache name still prints and shares fine.
    return result.uri;
  }
}
