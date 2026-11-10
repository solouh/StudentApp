/**
 * Design Studio document model.
 *
 * Everything is stored in millimetres relative to the page, so the same numbers
 * drive the on-screen canvas (scaled down) and the printed PDF (1:1). All the
 * functions here are pure, which keeps the editor predictable and testable.
 */
import { createId } from '../../lib/id';

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

export type PageKind = 'A4' | 'A4L' | 'square' | 'phone' | 'card';

export type PageSpec = {
  id: PageKind;
  label: string;
  /** Width in millimetres. */
  wMm: number;
  /** Height in millimetres. */
  hMm: number;
  /** CSS `@page { size }` value for print/PDF. */
  cssSize: string;
};

export const PAGES: Record<PageKind, PageSpec> = {
  A4: { id: 'A4', label: 'A4 portrait', wMm: 210, hMm: 297, cssSize: 'A4 portrait' },
  A4L: { id: 'A4L', label: 'A4 landscape', wMm: 297, hMm: 210, cssSize: 'A4 landscape' },
  square: { id: 'square', label: 'Square · 120 mm', wMm: 120, hMm: 120, cssSize: '120mm 120mm' },
  phone: { id: 'phone', label: 'Phone 9:16', wMm: 108, hMm: 192, cssSize: '108mm 192mm' },
  card: { id: 'card', label: '3 × 5 card', wMm: 76, hMm: 127, cssSize: '76mm 127mm' },
};

export const PAGE_ORDER: PageKind[] = ['A4', 'A4L', 'square', 'phone', 'card'];

export function getPage(kind: PageKind): PageSpec {
  return PAGES[kind] ?? PAGES.A4;
}

/* ------------------------------------------------------------------ */
/* Layers                                                              */
/* ------------------------------------------------------------------ */

export type LayerType = 'text' | 'shape' | 'image' | 'emoji';
export type ShapeKind = 'rect' | 'ellipse' | 'line';
export type TextAlign = 'left' | 'center' | 'right';

type LayerBase = {
  id: string;
  name: string;
  /** Position and size in millimetres, relative to the page top-left. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrees, clockwise. */
  rotation: number;
  /** 0..1 */
  opacity: number;
  locked: boolean;
};

export type TextLayer = LayerBase & {
  type: 'text';
  text: string;
  /** Cap height in millimetres, used as the CSS font-size. */
  fontSize: number;
  color: string;
  weight: 400 | 600 | 800;
  align: TextAlign;
};

export type ShapeLayer = LayerBase & {
  type: 'shape';
  shape: ShapeKind;
  fill: string;
  stroke: string;
  /** mm; 0 means no border. */
  strokeWidth: number;
  /** Corner radius in mm (rectangles only). */
  radius: number;
};

export type ImageLayer = LayerBase & {
  type: 'image';
  uri: string;
  fit: 'cover' | 'contain';
};

export type EmojiLayer = LayerBase & {
  type: 'emoji';
  emoji: string;
  /** Sticker size in millimetres. */
  size: number;
};

export type Layer = TextLayer | ShapeLayer | ImageLayer | EmojiLayer;

/** Fields a caller may patch. `id` and `type` stay fixed. */
export type LayerPatch = Partial<
  Omit<TextLayer, 'type'> &
    Omit<ShapeLayer, 'type'> &
    Omit<ImageLayer, 'type'> &
    Omit<EmojiLayer, 'type'>
>;

export type Design = {
  id: string;
  title: string;
  page: PageKind;
  background: string;
  /** Bottom to top: the last entry paints on top. */
  layers: Layer[];
  updatedAt: number;
};

/* ------------------------------------------------------------------ */
/* Limits                                                              */
/* ------------------------------------------------------------------ */

/** Layers never shrink below this (mm), or they become impossible to grab. */
export const MIN_SIZE_MM = 4;

export const SWATCHES = [
  '#0E1A15',
  '#5F6F69',
  '#97A5A0',
  '#FFFFFF',
  '#2FBF92',
  '#6ED9B4',
  '#E6F8F1',
  '#F4C471',
  '#B9A6F5',
  '#8AC4F5',
  '#F5A97F',
  '#F0796B',
] as const;

export const EMOJI_CHOICES = ['🌱', '🌸', '⭐', '✨', '🔥', '🎯', '📚', '✏️', '🧪', '🧬', '🪐', '🌾'] as const;

/* ------------------------------------------------------------------ */
/* Factories                                                           */
/* ------------------------------------------------------------------ */

export function createDesign(page: PageKind = 'A4', title = 'Untitled design'): Design {
  return {
    id: createId('design'),
    title,
    page,
    background: '#FFFFFF',
    layers: [],
    updatedAt: Date.now(),
  };
}

function baseLayer(name: string, x: number, y: number, w: number, h: number) {
  return { id: createId('layer'), name, x, y, w, h, rotation: 0, opacity: 1, locked: false };
}

export function createTextLayer(text = 'Double-tap to edit', x: number, y: number, w: number): TextLayer {
  return {
    ...baseLayer('Text', x, y, w, 14),
    type: 'text',
    text,
    fontSize: 7,
    color: '#0E1A15',
    weight: 600,
    align: 'left',
  };
}

export function createShapeLayer(
  shape: ShapeKind,
  x: number,
  y: number,
  w: number,
  h: number,
  fill = '#E6F8F1',
): ShapeLayer {
  return {
    ...baseLayer(shape === 'ellipse' ? 'Ellipse' : shape === 'line' ? 'Line' : 'Rectangle', x, y, w, h),
    type: 'shape',
    shape,
    fill,
    stroke: 'transparent',
    strokeWidth: 0,
    radius: shape === 'rect' ? 4 : 0,
  };
}

export function createEmojiLayer(emoji: string, x: number, y: number, size = 18): EmojiLayer {
  return {
    ...baseLayer('Sticker', x, y, size, size),
    type: 'emoji',
    emoji,
    size,
  };
}

export function createImageLayer(uri: string, x: number, y: number, w: number, h: number): ImageLayer {
  return {
    ...baseLayer('Photo', x, y, w, h),
    type: 'image',
    uri,
    fit: 'cover',
  };
}

/* ------------------------------------------------------------------ */
/* Bounds and hit testing                                              */
/* ------------------------------------------------------------------ */

export function layerBounds(layer: Layer): { x: number; y: number; w: number; h: number } {
  return { x: layer.x, y: layer.y, w: layer.w, h: layer.h };
}

/** Keeps a layer on the page, shrinking it first when it is too large. */
export function clampLayer(layer: Layer, page: PageSpec): Layer {
  const w = Math.max(MIN_SIZE_MM, Math.min(layer.w, page.wMm));
  const h = Math.max(MIN_SIZE_MM, Math.min(layer.h, page.hMm));
  const x = Math.max(0, Math.min(layer.x, page.wMm - w));
  const y = Math.max(0, Math.min(layer.y, page.hMm - h));
  return { ...layer, x, y, w, h };
}

/** Topmost visible, unlocked layer under a page-space point, or null. */
export function hitTest(design: Design, xMm: number, yMm: number): Layer | null {
  for (let index = design.layers.length - 1; index >= 0; index -= 1) {
    const layer = design.layers[index];
    if (layer.locked) continue;
    if (
      xMm >= layer.x &&
      xMm <= layer.x + layer.w &&
      yMm >= layer.y &&
      yMm <= layer.y + layer.h
    ) {
      return layer;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Mutations (return new documents; never mutate the input)            */
/* ------------------------------------------------------------------ */

function touch(design: Design, layers: Layer[]): Design {
  return { ...design, layers, updatedAt: Date.now() };
}

export function addLayer(design: Design, layer: Layer): Design {
  return touch(design, [...design.layers, clampLayer(layer, getPage(design.page))]);
}

export function updateLayer(design: Design, id: string, patch: LayerPatch): Design {
  const page = getPage(design.page);
  return touch(
    design,
    design.layers.map((layer) =>
      layer.id === id ? clampLayer({ ...layer, ...patch }, page) : layer,
    ),
  );
}

/** Moves a layer by a delta in mm, clamped to the page. */
export function moveLayer(design: Design, id: string, dxMm: number, dyMm: number): Design {
  const page = getPage(design.page);
  return touch(
    design,
    design.layers.map((layer) =>
      layer.id === id ? clampLayer({ ...layer, x: layer.x + dxMm, y: layer.y + dyMm }, page) : layer,
    ),
  );
}

export function removeLayer(design: Design, id: string): Design {
  return touch(design, design.layers.filter((layer) => layer.id !== id));
}

/** Copy of a layer, nudged 4 mm down-right so it is visibly on top. */
export function duplicateLayer(design: Design, id: string): { design: Design; layerId: string | null } {
  const source = design.layers.find((layer) => layer.id === id);
  if (!source) return { design, layerId: null };

  const copy = clampLayer(
    {
      ...source,
      id: createId('layer'),
      name: `${source.name} copy`,
      x: source.x + 4,
      y: source.y + 4,
    },
    getPage(design.page),
  );

  const index = design.layers.findIndex((layer) => layer.id === id);
  const layers = [...design.layers];
  layers.splice(index + 1, 0, copy);
  return { design: touch(design, layers), layerId: copy.id };
}

/** Moves one step: +1 is towards the front (painted later), -1 towards the back. */
export function reorderLayer(design: Design, id: string, delta: number): Design {
  const index = design.layers.findIndex((layer) => layer.id === id);
  if (index < 0) return design;
  const target = Math.max(0, Math.min(design.layers.length - 1, index + delta));
  if (target === index) return design;
  const layers = [...design.layers];
  const [moved] = layers.splice(index, 1);
  layers.splice(target, 0, moved);
  return touch(design, layers);
}

export function bringToFront(design: Design, id: string): Design {
  return reorderLayer(design, id, design.layers.length);
}

export function sendToBack(design: Design, id: string): Design {
  return reorderLayer(design, id, -design.layers.length);
}

export function setPage(design: Design, page: PageKind): Design {
  const spec = getPage(page);
  return {
    ...design,
    page,
    layers: design.layers.map((layer) => clampLayer(layer, spec)),
    updatedAt: Date.now(),
  };
}

/* ------------------------------------------------------------------ */
/* Screen helpers                                                      */
/* ------------------------------------------------------------------ */

/** Pixels per millimetre for a canvas drawn `widthPx` wide. */
export function scaleFor(page: PageSpec, widthPx: number): number {
  return widthPx / page.wMm;
}

/** Canvas height in px for a given canvas width. */
export function canvasHeightPx(page: PageSpec, widthPx: number): number {
  return widthPx * (page.hMm / page.wMm);
}

/** Round-trips a screen x to page space. */
export function toMm(px: number, scale: number): number {
  return scale > 0 ? px / scale : 0;
}

export function visibleLayers(design: Design): Layer[] {
  return design.layers;
}

/** Short human summary for the header, e.g. "6 layers · A4 portrait". */
export function describeDesign(design: Design): string {
  const count = design.layers.length;
  return `${count} ${count === 1 ? 'layer' : 'layers'} · ${getPage(design.page).label}`;
}
