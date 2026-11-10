/**
 * Paper sizes and page layout in millimetres.
 *
 * Print output is authored in `mm` end to end so the Android/iOS print dialog
 * reproduces physical sizes 1:1 instead of relying on CSS pixels.
 */

export type PaperId = 'A4' | 'A4L' | 'Letter' | '4R';

export type Paper = {
  id: PaperId;
  label: string;
  /** Width in millimetres. */
  w: number;
  /** Height in millimetres. */
  h: number;
  /** CSS `@page { size: ... }` value. */
  cssSize: string;
};

export const PAPERS: Record<PaperId, Paper> = {
  A4: { id: 'A4', label: 'A4 · 210 × 297 mm', w: 210, h: 297, cssSize: 'A4 portrait' },
  A4L: { id: 'A4L', label: 'A4 landscape · 297 × 210 mm', w: 297, h: 210, cssSize: 'A4 landscape' },
  Letter: {
    id: 'Letter',
    label: 'Letter · 216 × 279 mm',
    w: 215.9,
    h: 279.4,
    cssSize: 'Letter portrait',
  },
  '4R': { id: '4R', label: '4R photo · 102 × 152 mm', w: 102, h: 152, cssSize: '102mm 152mm' },
};

export const PAPER_IDS: PaperId[] = ['A4', 'A4L', 'Letter', '4R'];

export type RectMm = { x: number; y: number; w: number; h: number };

export function getPaper(id: PaperId): Paper {
  return PAPERS[id] ?? PAPERS.A4;
}

export function contentBoxMm(
  paper: Paper,
  marginMm: number,
): { x: number; y: number; w: number; h: number } {
  const margin = Math.max(0, Math.min(marginMm, Math.min(paper.w, paper.h) / 2 - 5));
  return {
    x: margin,
    y: margin,
    w: paper.w - margin * 2,
    h: paper.h - margin * 2,
  };
}

export type GridLayoutOptions = {
  paper: Paper;
  marginMm: number;
  gutterMm: number;
  rows: number;
  cols: number;
};

/**
 * Even grid of cells inside the paper margins. Throws when the requested
 * margins/gutter leave no room for cells.
 */
export function layoutCellsMm({ paper, marginMm, gutterMm, rows, cols }: GridLayoutOptions): RectMm[] {
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) {
    throw new Error('layoutCellsMm: rows and cols must be positive integers');
  }
  const box = contentBoxMm(paper, marginMm);
  const gutter = Math.max(0, gutterMm);
  const cellW = (box.w - gutter * (cols - 1)) / cols;
  const cellH = (box.h - gutter * (rows - 1)) / rows;

  if (!(cellW > 0) || !(cellH > 0)) {
    throw new Error('Margins or gutter are too large for this grid');
  }

  const cells: RectMm[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      cells.push({
        x: box.x + c * (cellW + gutter),
        y: box.y + r * (cellH + gutter),
        w: cellW,
        h: cellH,
      });
    }
  }
  return cells;
}

/** Aspect ratio (w/h) of a grid cell, from the same inputs as `layoutCellsMm`. */
export function cellAspectMm(options: Omit<GridLayoutOptions, 'paper'> & { paper: Paper }): number {
  const cells = layoutCellsMm(options);
  const first = cells[0];
  return first.h > 0 ? first.w / first.h : 1;
}

/** CSS points for millimetres (only used for type sizes in print CSS). */
export function mmToPt(mm: number): number {
  return mm * 2.83465;
}

/** Centered fit of a source rectangle in px/mm into a box, same units. */
export function fitMm(
  srcW: number,
  srcH: number,
  box: RectMm,
): RectMm {
  if (!(srcW > 0) || !(srcH > 0)) {
    return { ...box, w: Math.max(1, box.w), h: Math.max(1, box.h) };
  }
  const scale = Math.min(box.w / srcW, box.h / srcH);
  const w = srcW * scale;
  const h = srcH * scale;
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}
