import { describe, expect, it } from 'vitest';
import {
  clamp,
  coverBaseCrop,
  cropAtZoom,
  cropToPx,
  expandRect,
  fitRectToBox,
  isValidGrid,
  panCrop,
  rectAspect,
  sliceRects,
} from '../media/crop-math';

describe('coverBaseCrop', () => {
  it('crops the wide side of a landscape image', () => {
    const crop = coverBaseCrop(1200, 800, 1); // square cell
    expect(crop.h).toBe(1);
    expect(crop.w).toBeCloseTo(800 / 1200, 6);
    expect(crop.w * 1200).toBeCloseTo(crop.h * 800);
  });

  it('crops the tall side of a portrait image', () => {
    const crop = coverBaseCrop(600, 1200, 1);
    expect(crop.w).toBe(1);
    expect(crop.h).toBeCloseTo(600 / 1200, 6);
  });

  it('matches the requested box aspect', () => {
    const aspect = 210 / 297;
    const crop = coverBaseCrop(4000, 3000, aspect);
    expect((crop.w * 4000) / (crop.h * 3000)).toBeCloseTo(aspect, 6);
  });

  it('rejects invalid dimensions', () => {
    expect(() => coverBaseCrop(0, 100, 1)).toThrow();
    expect(() => coverBaseCrop(100, 100, 0)).toThrow();
  });
});

describe('cropAtZoom', () => {
  it('stays inside the image and keeps the aspect', () => {
    const crop = cropAtZoom(3000, 2000, 0.75, 4, { x: 0, y: 1 });
    expect(crop.x).toBeGreaterThanOrEqual(0);
    expect(crop.y).toBeGreaterThanOrEqual(0);
    expect(crop.x + crop.w).toBeLessThanOrEqual(1 + 1e-9);
    expect(crop.y + crop.h).toBeLessThanOrEqual(1 + 1e-9);
    expect((crop.w * 3000) / (crop.h * 2000)).toBeCloseTo(0.75, 6);
  });

  it('clamps zoom below 1', () => {
    const base = cropAtZoom(1000, 1000, 1, 1, { x: 0.5, y: 0.5 });
    const lower = cropAtZoom(1000, 1000, 1, 0.2, { x: 0.5, y: 0.5 });
    expect(lower.w).toBeCloseTo(base.w, 6);
  });

  it('centers an un-zoomed square crop', () => {
    const crop = cropAtZoom(2000, 1000, 1, 1, { x: 0.5, y: 0.5 });
    expect(crop.x).toBeCloseTo(0.25, 6);
    expect(crop.y).toBeCloseTo(0, 6);
  });
});

describe('panCrop', () => {
  const cell = { w: 300, h: 300 };

  it('moves opposite to the drag direction', () => {
    const start = cropAtZoom(1000, 1000, 1, 2, { x: 0.5, y: 0.5 });
    const movedRight = panCrop(start, 30, 0, cell.w, cell.h);
    expect(movedRight.x).toBeLessThan(start.x);

    const movedLeft = panCrop(start, -30, 0, cell.w, cell.h);
    expect(movedLeft.x).toBeGreaterThan(start.x);
  });

  it('never leaves the image', () => {
    const start = cropAtZoom(1000, 1000, 1, 2, { x: 0.5, y: 0.5 });
    const far = panCrop(start, 100000, 100000, cell.w, cell.h);
    expect(far.x).toBeGreaterThanOrEqual(0);
    expect(far.y).toBeGreaterThanOrEqual(0);
    expect(far.x + far.w).toBeLessThanOrEqual(1 + 1e-9);
  });

  it('handles zero-sized cells safely', () => {
    const start = cropAtZoom(1000, 1000, 1, 1, { x: 0.5, y: 0.5 });
    expect(panCrop(start, 10, 10, 0, 0)).toBe(start);
  });
});

describe('cropToPx', () => {
  it('returns integers inside the image', () => {
    const rect = cropToPx({ x: 0.1, y: 0.2, w: 0.5, h: 0.4 }, 1000, 800);
    expect(Number.isInteger(rect.originX)).toBe(true);
    expect(Number.isInteger(rect.originY)).toBe(true);
    expect(rect.originX).toBeGreaterThanOrEqual(0);
    expect(rect.originY).toBeGreaterThanOrEqual(0);
    expect(rect.originX + rect.width).toBeLessThanOrEqual(1000);
    expect(rect.originY + rect.height).toBeLessThanOrEqual(800);
  });

  it('clamps a crop that overflows the image', () => {
    const rect = cropToPx({ x: 0.8, y: 0.9, w: 0.5, h: 0.5 }, 500, 500);
    expect(rect.originX + rect.width).toBeLessThanOrEqual(500);
    expect(rect.originY + rect.height).toBeLessThanOrEqual(500);
    expect(rect.width).toBeGreaterThan(0);
  });
});

describe('sliceRects', () => {
  it('splits evenly without gaps or overlaps', () => {
    const rects = sliceRects(1000, 700, 3, 3);
    expect(rects).toHaveLength(9);

    // Every tile starts where the previous one ends.
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const tile = rects[row * 3 + col];
        const right = tile.originX + tile.width;
        const bottom = tile.originY + tile.height;
        if (col < 2) {
          const next = rects[row * 3 + col + 1];
          expect(next.originX).toBe(right);
        }
        if (row < 2) {
          const below = rects[(row + 1) * 3 + col];
          expect(below.originY).toBe(bottom);
        }
        expect(tile.originX).toBeLessThanOrEqual(1000);
        expect(bottom).toBeLessThanOrEqual(700);
      }
    }

    const area = rects.reduce((sum, rect) => sum + rect.width * rect.height, 0);
    expect(area).toBeGreaterThanOrEqual(1000 * 700 - 1);
    expect(area).toBeLessThanOrEqual(1000 * 700 + 1);
  });

  it('covers uneven sizes', () => {
    const rects = sliceRects(1001, 703, 2, 2);
    expect(rects.map((r) => r.width)).toEqual([501, 500, 501, 500]);
    expect(rects.map((r) => r.height)).toEqual([352, 352, 351, 351]);
  });

  it('rejects bad grids', () => {
    expect(() => sliceRects(100, 100, 0, 2)).toThrow();
    expect(() => sliceRects(100, 100, 1.5, 2)).toThrow();
    expect(() => sliceRects(0, 100, 1, 2)).toThrow();
  });
});

describe('isValidGrid', () => {
  it('needs tiles of at least 32 px', () => {
    expect(isValidGrid(3000, 3000, 3, 3)).toBe(true);
    expect(isValidGrid(60, 60, 3, 3)).toBe(false);
    expect(isValidGrid(1000, 1000, 0, 1)).toBe(false);
  });
});

describe('expandRect', () => {
  it('grows and clamps at the edges', () => {
    const expanded = expandRect({ originX: 0, originY: 0, width: 100, height: 100 }, 10, 10, 1000, 500);
    expect(expanded).toEqual({ originX: 0, originY: 0, width: 110, height: 110 });

    const clamped = expandRect(
      { originX: 900, originY: 400, width: 100, height: 100 },
      50,
      50,
      1000,
      500,
    );
    expect(clamped.originX + clamped.width).toBe(1000);
    expect(clamped.originY + clamped.height).toBe(500);
  });
});

describe('fitRectToBox', () => {
  it('centers a fitted rect', () => {
    const fit = fitRectToBox(400, 200, 100, 100);
    expect(fit.w).toBe(100);
    expect(fit.h).toBe(50);
    expect(fit.x).toBe(0);
    expect(fit.y).toBe(25);
  });
});

describe('helpers', () => {
  it('rectAspect guards zero height', () => {
    expect(rectAspect({ width: 10, height: 0 })).toBe(1);
  });

  it('clamp works with inverted ranges', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(5, 10, 0)).toBe(10);
  });
});
