/**
 * Typed errors used by the toolbox. Screens switch on `kind` to show a friendly
 * message instead of a raw native exception.
 */

export type ToolErrorKind =
  | 'permission'
  | 'cancelled'
  | 'print'
  | 'share'
  | 'gallery'
  | 'image'
  | 'grid'
  | 'unknown';

export class ToolError extends Error {
  readonly kind: ToolErrorKind;
  readonly original?: unknown;

  constructor(kind: ToolErrorKind, message: string, original?: unknown) {
    super(message);
    this.name = 'ToolError';
    this.kind = kind;
    this.original = original;
  }
}

export function toToolError(error: unknown, fallbackKind: ToolErrorKind = 'unknown'): ToolError {
  if (error instanceof ToolError) return error;
  const message =
    error instanceof Error && error.message
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Something went wrong.';
  return new ToolError(fallbackKind, message, error);
}

export function isCancelled(error: unknown): boolean {
  if (error instanceof ToolError && error.kind === 'cancelled') return true;
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /cancel/i.test(message);
}

/** User-facing copy for each error kind. */
export const ERROR_MESSAGES: Record<ToolErrorKind, string> = {
  permission: 'Allow photo access to continue.',
  cancelled: 'Cancelled.',
  print: 'The print dialog did not open. Save a PDF instead and share it.',
  share: 'The share sheet is unavailable. Try saving the file to your photos.',
  gallery: 'Saving to Photos is limited in Expo Go. Use Share instead, or a development build.',
  image: "That photo couldn't be processed. Try another image.",
  grid: 'This grid is too fine for the selected photo.',
  unknown: 'Something went wrong. Please try again.',
};
