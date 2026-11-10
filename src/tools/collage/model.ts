/**
 * Pure state model for the print studio (collage / poster / ID sheet).
 *
 * Screens own React state; every layout decision lives here so it can be unit
 * tested without a device.
 */
import {
  clamp,
  coverBaseCrop,
  cropAtZoom,
  cropCenter,
  expandRect,
  fitRectToBox,
  MAX_ZOOM,
  sliceRects,
} from '../../lib/media/crop-math';
import type { Crop, Photo, RectPx } from '../../lib/media/types';
import {
  contentBoxMm,
  fitMm,
  getPaper,
  layoutCellsMm,
  type PaperId,
  type RectMm,
} from '../../lib/print/a4';
import { shortDate } from '../../lib/format';

export const MAX_COLLAGE_PHOTOS = 9;
export const MAX_GRID = 4;
export const MIN_GRID = 1;

export type GridPreset = { rows: number; cols: number; label: string };

export const COLLAGE_PRESETS: GridPreset[] = [
  { rows: 2, cols: 2, label: '2 × 2' },
  { rows: 3, cols: 2, label: '3 × 2' },
  { rows: 2, cols: 3, label: '2 × 3' },
  { rows: 3, cols: 3, label: '3 × 3' },
  { rows: 1, cols: 2, label: '1 × 2' },
  { rows: 1, cols: 3, label: '1 × 3' },
];

export const SLICE_PRESETS: GridPreset[] = [
  { rows: 2, cols: 2, label: '2 × 2' },
  { rows: 3, cols: 3, label: '3 × 3' },
  { rows: 4, cols: 4, label: '4 × 4' },
  { rows: 1, cols: 3, label: '1 × 3' },
  { rows: 3, cols: 1, label: '3 × 1' },
  { rows: 2, cols: 1, label: '2 × 1' },
];

export const BACKGROUND_SWATCHES = [
  { id: 'white', label: 'White', color: '#FFFFFF' },
  { id: 'mint', label: 'Mint', color: '#F2FCF8' },
  { id: 'cream', label: 'Cream', color: '#FDF8EF' },
  { id: 'ink', label: 'Ink', color: '#16241E' },
  { id: 'sky', label: 'Sky', color: '#EFF6FD' },
] as const;

export const EMPTY_CROP: Crop = { x: 0, y: 0, w: 1, h: 1 };

/* ------------------------------------------------------------------ */
/* Collage                                                             */
/* ------------------------------------------------------------------ */

export type CollageCell = { photo: Photo | null; crop: Crop };

export type CollageDoc = {
  schemaVersion: 1;
  title: string;
  paper: PaperId;
  marginMm: number;
  gutterMm: number;
  radiusMm: number;
  background: string;
  rows: number;
  cols: number;
  cells: CollageCell[];
  showRuler: boolean;
  showCutMarks: boolean;
  showCaptions: boolean;
  caption: string;
};

export type CollageDefaults = Omit<
  CollageDoc,
  'schemaVersion' | 'cells' | 'rows' | 'cols' | 'title' | 'caption' | 'showCaptions'
>;

export function createCollageDoc(
  defaults: CollageDefaults,
  initial?: Partial<Pick<CollageDoc, 'title' | 'rows' | 'cols' | 'caption'>>,
): CollageDoc {
  const rows = initial?.rows ?? 2;
  const cols = initial?.cols ?? 2;
  const aspect = cellAspectFor({
    paper: defaults.paper,
    marginMm: defaults.marginMm,
    gutterMm: defaults.gutterMm,
    rows,
    cols,
  });

  return {
    schemaVersion: 1,
    title: initial?.title ?? 'My collage',
    paper: defaults.paper,
    marginMm: defaults.marginMm,
    gutterMm: defaults.gutterMm,
    radiusMm: defaults.radiusMm,
    background: defaults.background,
    rows,
    cols,
    cells: createCells(rows * cols, [], aspect),
    showRuler: defaults.showRuler,
    showCutMarks: defaults.showCutMarks,
    showCaptions: false,
    caption: initial?.caption ?? '',
  };
}

function createCells(count: number, photos: Photo[], aspect: number): CollageCell[] {
  return Array.from({ length: count }, (_, index) => {
    const photo = photos[index] ?? null;
    return {
      photo,
      crop: photo ? defaultCropFor(photo, aspect) : { ...EMPTY_CROP },
    };
  });
}

export type CellAspectInput = Pick<CollageDoc, 'paper' | 'marginMm' | 'gutterMm' | 'rows' | 'cols'>;

/** Aspect ratio of one collage cell, in millimetres. */
export function cellAspectFor(doc: CellAspectInput): number {
  const cells = layoutCellsMm({
    paper: getPaper(doc.paper),
    marginMm: doc.marginMm,
    gutterMm: doc.gutterMm,
    rows: doc.rows,
    cols: doc.cols,
  });
  const first = cells[0];
  return first.h > 0 ? first.w / first.h : 1;
}

/** Default (centered, un-zoomed) cover crop for a cell. */
export function defaultCropFor(photo: Photo, boxAspect: number): Crop {
  return cropAtZoom(photo.width, photo.height, boxAspect, 1, { x: 0.5, y: 0.5 });
}

/**
 * Re-fits a stored crop to a new cell aspect (paper / margin / grid changes)
 * while keeping the same zoom and centre.
 */
export function aspectAdjustedCrop(photo: Photo, crop: Crop, boxAspect: number): Crop {
  const base = coverBaseCrop(photo.width, photo.height, boxAspect);
  const zoom = clamp(base.w / Math.max(crop.w, 0.0001), 1, MAX_ZOOM);
  return cropAtZoom(photo.width, photo.height, boxAspect, zoom, cropCenter(crop));
}

/**
 * Rebuilds the grid, keeping existing photos in reading order. Crops are reset
 * because the cell aspect changes with the grid.
 */
export function resizeCollageGrid(doc: CollageDoc, rows: number, cols: number): CollageDoc {
  const nextRows = clampGrid(rows);
  const nextCols = clampGrid(cols);
  const photos = doc.cells
    .map((cell) => cell.photo)
    .filter((photo): photo is Photo => photo !== null);
  const aspect = cellAspectFor({ ...doc, rows: nextRows, cols: nextCols });

  return {
    ...doc,
    rows: nextRows,
    cols: nextCols,
    cells: createCells(nextRows * nextCols, photos, aspect),
  };
}

export function clampGrid(value: number): number {
  return Math.min(MAX_GRID, Math.max(MIN_GRID, Math.round(value)));
}

/** Adds photos into the first empty cells (reading order). */
export function addPhotosToCollage(doc: CollageDoc, photos: Photo[]): CollageDoc {
  const cells = doc.cells.map((cell) => ({ ...cell }));
  const aspect = cellAspectFor(doc);
  let cursor = 0;

  for (const photo of photos) {
    while (cursor < cells.length && cells[cursor].photo) cursor += 1;
    if (cursor >= cells.length) break;
    cells[cursor] = { photo, crop: defaultCropFor(photo, aspect) };
    cursor += 1;
  }

  return { ...doc, cells };
}

export function updateCellCrop(doc: CollageDoc, index: number, crop: Crop): CollageDoc {
  if (index < 0 || index >= doc.cells.length) return doc;
  const cells = doc.cells.map((cell, cellIndex) =>
    cellIndex === index ? { ...cell, crop } : cell,
  );
  return { ...doc, cells };
}

export function clearCell(doc: CollageDoc, index: number): CollageDoc {
  if (index < 0 || index >= doc.cells.length) return doc;
  const cells = doc.cells.map((cell, cellIndex) =>
    cellIndex === index ? { photo: null, crop: { ...EMPTY_CROP } } : cell,
  );
  return { ...doc, cells };
}

export function filledCellCount(doc: CollageDoc): number {
  return doc.cells.filter((cell) => cell.photo !== null).length;
}

/* ------------------------------------------------------------------ */
/* Slice / poster                                                      */
/* ------------------------------------------------------------------ */

export type SliceMode = 'poster' | 'sheet';

export type SliceDoc = {
  schemaVersion: 1;
  title: string;
  photo: Photo;
  rows: number;
  cols: number;
  mode: SliceMode;
  marginMm: number;
  gutterMm: number;
  overlapMm: number;
  paper: PaperId;
  showCutMarks: boolean;
  showLabels: boolean;
  showRuler: boolean;
};

export function createSliceDoc(photo: Photo, defaults: {
  paper: PaperId;
  marginMm: number;
  gutterMm: number;
  showCutMarks: boolean;
  showLabels: boolean;
  showRuler: boolean;
}): SliceDoc {
  return {
    schemaVersion: 1,
    title: 'Poster print',
    photo,
    rows: 3,
    cols: 3,
    mode: 'poster',
    marginMm: 10,
    gutterMm: defaults.gutterMm,
    overlapMm: 0,
    paper: defaults.paper,
    showCutMarks: defaults.showCutMarks,
    showLabels: defaults.showLabels,
    showRuler: defaults.showRuler,
  };
}

export function sliceTilesFor(doc: Pick<SliceDoc, 'photo' | 'rows' | 'cols'>): RectPx[] {
  return sliceRects(doc.photo.width, doc.photo.height, doc.rows, doc.cols);
}

/**
 * Bleed-expanded crop for one poster tile. `printWidthMm` is the width the tile
 * will occupy on paper, used to convert the requested overlap millimetres into
 * source pixels.
 */
export function posterTileRect(
  doc: SliceDoc,
  index: number,
  printWidthMm: number,
): RectPx {
  const tiles = sliceTilesFor(doc);
  const tile = tiles[index] ?? tiles[0];
  if (!tile || doc.overlapMm <= 0 || printWidthMm <= 0) return tile;

  const dx = (doc.overlapMm / printWidthMm) * tile.width;
  const dy = (doc.overlapMm / printWidthMm) * tile.width;
  return expandRect(tile, dx, dy, doc.photo.width, doc.photo.height);
}

/* ------------------------------------------------------------------ */
/* ID photo sheet                                                      */
/* ------------------------------------------------------------------ */

export type IdSize = { id: string; label: string; wMm: number; hMm: number };

export const ID_SIZES: IdSize[] = [
  { id: 'passport', label: 'Passport · 35 × 50 mm', wMm: 35, hMm: 50 },
  { id: 'standard', label: 'Standard · 35 × 45 mm', wMm: 35, hMm: 45 },
  { id: 'small', label: 'Small · 25 × 35 mm', wMm: 25, hMm: 35 },
  { id: 'square', label: 'Square · 2 × 2 in', wMm: 50.8, hMm: 50.8 },
];

export type IdSheetPaper = '4R' | 'A4';
export type IdDoc = {
  schemaVersion: 1;
  title: string;
  photo: Photo;
  crop: Crop;
  size: IdSize;
  paper: IdSheetPaper;
  copies: 'auto' | number;
  gutterMm: number;
  showCutMarks: boolean;
  showRuler: boolean;
};

export const ID_SHEET_MARGIN_MM = 6;

export function createIdDoc(photo: Photo, defaults: {
  paper: PaperId;
  showCutMarks: boolean;
  showRuler: boolean;
}): IdDoc {
  const size = ID_SIZES[0];
  return {
    schemaVersion: 1,
    title: 'ID photo sheet',
    photo,
    crop: idCropFor(photo, size, 1, { x: 0.5, y: 0.5 }),
    size,
    paper: defaults.paper === '4R' ? '4R' : 'A4',
    copies: 'auto',
    gutterMm: 4,
    showCutMarks: defaults.showCutMarks,
    showRuler: defaults.showRuler,
  };
}

export function idCropFor(
  photo: Photo,
  size: IdSize,
  zoom: number,
  center: { x: number; y: number },
): Crop {
  return cropAtZoom(photo.width, photo.height, size.wMm / size.hMm, zoom, center);
}

/** How many copies fit on the selected sheet. */
export function idSheetCapacity(
  size: IdSize,
  paper: IdSheetPaper,
  gutterMm: number,
): number {
  const box = contentBoxMm(getPaper(paper), ID_SHEET_MARGIN_MM);
  const gutter = Math.max(0, gutterMm);
  const cols = Math.max(1, Math.floor((box.w + gutter) / (size.wMm + gutter)));
  const rows = Math.max(1, Math.floor((box.h + gutter) / (size.hMm + gutter)));
  return cols * rows;
}

/** Physical positions (mm) of each ID photo on the sheet, centered. */
export function idSheetLayout(
  size: IdSize,
  paper: IdSheetPaper,
  copies: 'auto' | number,
  gutterMm: number,
): RectMm[] {
  const sheet = getPaper(paper);
  const box = contentBoxMm(sheet, ID_SHEET_MARGIN_MM);
  const gutter = Math.max(0, gutterMm);
  const cols = Math.max(1, Math.floor((box.w + gutter) / (size.wMm + gutter)));
  const capacity = idSheetCapacity(size, paper, gutter);
  const count = Math.min(copies === 'auto' ? capacity : copies, capacity);
  const usedRows = Math.ceil(count / cols);

  const gridW = cols * size.wMm + (cols - 1) * gutter;
  const gridH = usedRows * size.hMm + (usedRows - 1) * gutter;
  const startX = (sheet.w - gridW) / 2;
  const startY = (sheet.h - gridH) / 2;

  const rects: RectMm[] = [];
  for (let index = 0; index < count; index += 1) {
    const row = Math.floor(index / cols);
    const col = index % cols;
    rects.push({
      x: startX + col * (size.wMm + gutter),
      y: startY + row * (size.hMm + gutter),
      w: size.wMm,
      h: size.hMm,
    });
  }
  return rects;
}

/** ID photo frame placed on the sheet for display purposes. */
export function idFrameRect(paper: IdSheetPaper, size: IdSize): RectMm {
  const sheet = getPaper(paper);
  const box = contentBoxMm(sheet, ID_SHEET_MARGIN_MM);
  return fitMm(size.wMm, size.hMm, box);
}

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

/** File-name slug, e.g. `poster-my-collage-2026-11-10`. */
export function outputFileName(
  kind: 'collage' | 'poster' | 'id-photo',
  title: string,
  date: Date = new Date(),
): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36);
  return `${kind}-${slug || 'print'}-${shortDate(date)}`;
}

/** Fits a rectangle into a display box while keeping the aspect. */
export function fitPreviewRect(
  width: number,
  height: number,
  boxW: number,
  boxH: number,
): { x: number; y: number; w: number; h: number } {
  return fitRectToBox(width, height, boxW, boxH);
}
