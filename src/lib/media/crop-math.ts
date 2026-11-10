/**
 * Crop / grid geometry for the print studio.
 *
 * Everything here is pure and unit-tested: source images are measured in
 * pixels, crops are kept as normalized rectangles (0..1) and only converted to
 * integer pixel rectangles at the very end, so previews and printed output can
 * never drift apart.
 */
import type { Crop, RectPx } from './types';

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 6;
export const MIN_TILE_PX = 32;

export function clamp(value: number, min: number, max: number): number {
  if (min > max) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Largest crop of `imgW x imgH` that fills a box of `boxAspect` (w/h).
 * One axis is always fully used; the other is cropped.
 */
export function coverBaseCrop(
  imgW: number,
  imgH: number,
  boxAspect: number,
): { w: number; h: number } {
  if (!(imgW > 0) || !(imgH > 0) || !(boxAspect > 0)) {
    throw new Error('coverBaseCrop: invalid dimensions');
  }
  const imgAspect = imgW / imgH;
  return imgAspect >= boxAspect
    ? { w: boxAspect / imgAspect, h: 1 }
    : { w: 1, h: imgAspect / boxAspect };
}

/**
 * Crop that fills `boxAspect`, zoomed by `zoom` (>= 1) and centered on
 * `center` (normalized source coordinates), clamped inside the image.
 */
export function cropAtZoom(
  imgW: number,
  imgH: number,
  boxAspect: number,
  zoom: number,
  center: { x: number; y: number },
): Crop {
  const base = coverBaseCrop(imgW, imgH, boxAspect);
  const z = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  const w = base.w / z;
  const h = base.h / z;
  const cx = clamp(center.x, w / 2, 1 - w / 2);
  const cy = clamp(center.y, h / 2, 1 - h / 2);
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/** Center of a normalized crop. */
export function cropCenter(crop: Crop): { x: number; y: number } {
  return { x: crop.x + crop.w / 2, y: crop.y + crop.h / 2 };
}

/**
 * Moves a crop by a finger drag of `(dxPx, dyPx)` inside a cell of
 * `cellW x cellH` pixels, keeping it inside the image.
 */
export function panCrop(
  crop: Crop,
  dxPx: number,
  dyPx: number,
  cellW: number,
  cellH: number,
): Crop {
  if (!(cellW > 0) || !(cellH > 0)) return crop;
  const x = clamp(crop.x - (dxPx * crop.w) / cellW, 0, 1 - crop.w);
  const y = clamp(crop.y - (dyPx * crop.h) / cellH, 0, 1 - crop.h);
  return { x, y, w: crop.w, h: crop.h };
}

/** Converts a normalized crop into an integer pixel rect inside the image. */
export function cropToPx(crop: Crop, imgW: number, imgH: number): RectPx {
  const x = clamp(crop.x, 0, 1);
  const y = clamp(crop.y, 0, 1);
  const w = Math.min(crop.w, 1 - x);
  const h = Math.min(crop.h, 1 - y);

  const originX = clamp(Math.round(x * imgW), 0, imgW - 1);
  const originY = clamp(Math.round(y * imgH), 0, imgH - 1);
  const endX = clamp(Math.round((x + w) * imgW), originX + 1, imgW);
  const endY = clamp(Math.round((y + h) * imgH), originY + 1, imgH);

  return { originX, originY, width: endX - originX, height: endY - originY };
}

/**
 * Integer tile rectangles for a `rows x cols` cut. Adjacent tiles share exactly
 * one boundary (no gaps, no overlaps), even when the image does not divide
 * evenly.
 */
export function sliceRects(
  imgW: number,
  imgH: number,
  rows: number,
  cols: number,
): RectPx[] {
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) {
    throw new Error('sliceRects: rows and cols must be positive integers');
  }
  if (!(imgW > 0) || !(imgH > 0)) {
    throw new Error('sliceRects: invalid image size');
  }

  const rects: RectPx[] = [];
  for (let r = 0; r < rows; r += 1) {
    const y0 = Math.round((r * imgH) / rows);
    const y1 = Math.round(((r + 1) * imgH) / rows);
    for (let c = 0; c < cols; c += 1) {
      const x0 = Math.round((c * imgW) / cols);
      const x1 = Math.round(((c + 1) * imgW) / cols);
      rects.push({
        originX: x0,
        originY: y0,
        width: Math.max(1, x1 - x0),
        height: Math.max(1, y1 - y0),
      });
    }
  }
  return rects;
}

/** True when every produced tile is at least `minTilePx` on both axes. */
export function isValidGrid(
  imgW: number,
  imgH: number,
  rows: number,
  cols: number,
  minTilePx = MIN_TILE_PX,
): boolean {
  if (!(imgW > 0) || !(imgH > 0)) return false;
  if (!Number.isInteger(rows) || !Number.isInteger(cols)) return false;
  if (rows < 1 || cols < 1) return false;
  const tileW = Math.floor(imgW / cols);
  const tileH = Math.floor(imgH / rows);
  return tileW >= minTilePx && tileH >= minTilePx;
}

/** Centered fit of `imgW x imgH` inside `boxW x boxH` (same units). */
export function fitRectToBox(
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number,
): { x: number; y: number; w: number; h: number } {
  if (!(imgW > 0) || !(imgH > 0) || !(boxW > 0) || !(boxH > 0)) {
    return { x: 0, y: 0, w: Math.max(1, boxW), h: Math.max(1, boxH) };
  }
  const scale = Math.min(boxW / imgW, boxH / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  return { x: (boxW - w) / 2, y: (boxH - h) / 2, w, h };
}

/** Aspect ratio (w/h) of a pixel rect, guarded against divide-by-zero. */
export function rectAspect(rect: { width: number; height: number }): number {
  return rect.height > 0 ? rect.width / rect.height : 1;
}

/**
 * Grows a tile rect by `dxPx`/`dyPx` on every side, clamped to the image.
 * Used for poster bleed so neighbouring pages overlap slightly when pasting.
 */
export function expandRect(
  rect: RectPx,
  dxPx: number,
  dyPx: number,
  imgW: number,
  imgH: number,
): RectPx {
  const x0 = clamp(Math.floor(rect.originX - dxPx), 0, Math.max(0, imgW - 1));
  const y0 = clamp(Math.floor(rect.originY - dyPx), 0, Math.max(0, imgH - 1));
  const x1 = clamp(Math.ceil(rect.originX + rect.width + dxPx), x0 + 1, imgW);
  const y1 = clamp(Math.ceil(rect.originY + rect.height + dyPx), y0 + 1, imgH);
  return { originX: x0, originY: y0, width: x1 - x0, height: y1 - y0 };
}
