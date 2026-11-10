/**
 * Base64 <-> data-uri helpers plus the print payload budget.
 *
 * Android's print WebView has to parse whatever HTML string we hand to
 * expo-print; very large PDF/data-uri payloads can stall low-end devices, so the
 * image pipeline re-encodes when this budget is exceeded.
 */

export const MAX_PRINT_PAYLOAD_BYTES = 13 * 1024 * 1024;

export function jpegDataUri(base64: string): string {
  return `data:image/jpeg;base64,${base64}`;
}

export function pngDataUri(base64: string): string {
  return `data:image/png;base64,${base64}`;
}

/** Approximate decoded size of base64 content. */
export function base64ByteSize(base64: string): number {
  if (!base64) return 0;
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

export function sumBase64Bytes(items: string[]): number {
  return items.reduce((total, item) => total + base64ByteSize(item), 0);
}

export function payloadFits(items: string[], budget = MAX_PRINT_PAYLOAD_BYTES): boolean {
  return sumBase64Bytes(items) <= budget;
}
