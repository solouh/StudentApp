import { describe, expect, it } from 'vitest';
import type { Photo } from '../../../lib/media/types';
import { cropToPx } from '../../../lib/media/crop-math';
import { DEFAULT_TOOL_SETTINGS } from '../../../lib/settings';
import { buildCollageHtml, buildIdSheetHtml, buildPosterHtml, buildSheetHtml } from '../html';
import {
  addPhotosToCollage,
  cellAspectFor,
  clearCell,
  createCollageDoc,
  createIdDoc,
  createSliceDoc,
  filledCellCount,
  idSheetCapacity,
  idSheetLayout,
  ID_SIZES,
  outputFileName,
  posterTileRect,
  resizeCollageGrid,
  sliceTilesFor,
  updateCellCrop,
} from '../model';

const photo: Photo = { id: 'p1', uri: 'file:///p1.jpg', width: 1200, height: 1600 };
const photo2: Photo = { id: 'p2', uri: 'file:///p2.jpg', width: 1600, height: 1200 };
const photo3: Photo = { id: 'p3', uri: 'file:///p3.jpg', width: 1000, height: 1000 };

const defaults = {
  paper: DEFAULT_TOOL_SETTINGS.paper,
  marginMm: 10,
  gutterMm: 4,
  radiusMm: 3,
  background: '#FFFFFF',
  showRuler: true,
  showCutMarks: true,
};

describe('collage model', () => {
  it('creates an empty grid with cover crops', () => {
    const doc = createCollageDoc(defaults);
    expect(doc.rows).toBe(2);
    expect(doc.cols).toBe(2);
    expect(doc.cells).toHaveLength(4);
    expect(filledCellCount(doc)).toBe(0);
  });

  it('adds photos in reading order and refills removed slots', () => {
    let doc = createCollageDoc(defaults);
    doc = addPhotosToCollage(doc, [photo, photo2]);
    expect(doc.cells[0]?.photo?.id).toBe('p1');
    expect(doc.cells[1]?.photo?.id).toBe('p2');

    doc = clearCell(doc, 0);
    doc = addPhotosToCollage(doc, [photo3]);
    expect(doc.cells[0]?.photo?.id).toBe('p3');
    expect(filledCellCount(doc)).toBe(2);
  });

  it('ignores extra photos beyond capacity', () => {
    let doc = createCollageDoc(defaults);
    doc = addPhotosToCollage(doc, [photo, photo2, photo3, photo, photo2]);
    expect(filledCellCount(doc)).toBe(4);
  });

  it('resizes the grid and keeps photos', () => {
    let doc = createCollageDoc(defaults, { rows: 2, cols: 2 });
    doc = addPhotosToCollage(doc, [photo, photo2]);
    doc = resizeCollageGrid(doc, 3, 3);
    expect(doc.cells).toHaveLength(9);
    expect(doc.cells[0]?.photo?.id).toBe('p1');
    expect(doc.cells[1]?.photo?.id).toBe('p2');
    expect(filledCellCount(doc)).toBe(2);
  });

  it('clamps grid values to 1..4', () => {
    const doc = resizeCollageGrid(createCollageDoc(defaults), 0, 99);
    expect(doc.rows).toBe(1);
    expect(doc.cols).toBe(4);
  });

  it('produces a crop matching the cell aspect', () => {
    const doc = addPhotosToCollage(createCollageDoc(defaults), [photo]);
    const aspect = cellAspectFor(doc);
    const crop = doc.cells[0].crop;
    const rect = cropToPx(crop, photo.width, photo.height);
    expect(rect.width / rect.height).toBeCloseTo(aspect, 2);
  });

  it('updates a crop only for valid indices', () => {
    const doc = createCollageDoc(defaults);
    const next = updateCellCrop(doc, 999, { x: 0, y: 0, w: 1, h: 1 });
    expect(next).toBe(doc);
  });
});

describe('slice model', () => {
  it('creates a 3x3 poster by default', () => {
    const doc = createSliceDoc(photo, {
      paper: 'A4',
      marginMm: 10,
      gutterMm: 4,
      showCutMarks: true,
      showLabels: true,
      showRuler: true,
    });
    expect(doc.rows).toBe(3);
    expect(doc.cols).toBe(3);
    expect(sliceTilesFor(doc)).toHaveLength(9);
  });

  it('keeps the exact tile when overlap is zero', () => {
    const doc = createSliceDoc(photo, {
      paper: 'A4',
      marginMm: 10,
      gutterMm: 4,
      showCutMarks: true,
      showLabels: true,
      showRuler: true,
    });
    const tiles = sliceTilesFor(doc);
    expect(posterTileRect(doc, 0, 60)).toEqual(tiles[0]);
  });

  it('expands the crop for overlap and clamps at the image edge', () => {
    const doc = { ...createSliceDoc(photo, {
      paper: 'A4',
      marginMm: 10,
      gutterMm: 4,
      showCutMarks: true,
      showLabels: true,
      showRuler: true,
    }), overlapMm: 5 };
    const tiles = sliceTilesFor(doc);
    const corner = posterTileRect(doc, 0, 60);
    const middle = posterTileRect(doc, 4, 60);

    expect(corner.originX).toBe(0); // clamped
    expect(middle.originX).toBeLessThan(tiles[4].originX);
    expect(middle.width).toBeGreaterThan(tiles[4].width);
  });
});

describe('id sheet model', () => {
  it('computes capacity for A4 and 4R', () => {
    const size = ID_SIZES[0];
    expect(idSheetCapacity(size, 'A4', 4)).toBe(25);
    expect(idSheetCapacity(size, '4R', 4)).toBe(4);
  });

  it('lays out auto copies inside the page', () => {
    const rects = idSheetLayout(ID_SIZES[0], '4R', 'auto', 4);
    expect(rects).toHaveLength(4);
    for (const rect of rects) {
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.w).toBeLessThanOrEqual(102.001);
      expect(rect.y + rect.h).toBeLessThanOrEqual(152.001);
    }
  });

  it('centers a manual copy count', () => {
    const rects = idSheetLayout(ID_SIZES[0], '4R', 2, 4);
    expect(rects).toHaveLength(2);
    const left = rects[0].x;
    const right = 102 - (rects[1].x + rects[1].w);
    expect(left).toBeCloseTo(right, 3);
  });

  it('creates a crop that matches the selected size', () => {
    const doc = createIdDoc(photo, { paper: 'A4', showCutMarks: true, showRuler: true });
    const rect = cropToPx(doc.crop, photo.width, photo.height);
    expect(rect.width / rect.height).toBeCloseTo(35 / 50, 2);
  });
});

describe('output file names', () => {
  it('slugs the title', () => {
    const name = outputFileName('poster', 'My Biology Notes!', new Date(2026, 10, 10));
    expect(name).toBe('poster-my-biology-notes-2026-11-10');
  });

  it('falls back when the title is empty', () => {
    const name = outputFileName('collage', '   ', new Date(2026, 10, 10));
    expect(name).toBe('collage-print-2026-11-10');
  });
});

describe('print HTML builders', () => {
  const images = [
    { dataUri: 'data:image/jpeg;base64,a', rectMm: { x: 10, y: 10, w: 92.5, h: 60 } },
    { dataUri: 'data:image/jpeg;base64,b', rectMm: { x: 106.5, y: 10, w: 92.5, h: 60 } },
    { dataUri: 'data:image/jpeg;base64,c', rectMm: { x: 10, y: 73, w: 92.5, h: 60 } },
    { dataUri: 'data:image/jpeg;base64,d', rectMm: { x: 106.5, y: 73, w: 92.5, h: 60 } },
  ];

  it('builds a single collage page with one image per cell', () => {
    const doc = createCollageDoc(defaults);
    const html = buildCollageHtml(doc, images);
    expect((html.match(/<section class="page">/g) ?? []).length).toBe(1);
    expect((html.match(/<img /g) ?? []).length).toBe(4);
    expect(html).toContain('background:#FFFFFF');
    expect(html).toContain('data:image/jpeg;base64,a');
  });

  it('escapes the collage title', () => {
    const doc = { ...createCollageDoc(defaults), title: 'A <B> & C' };
    const html = buildCollageHtml(doc, images);
    expect(html).not.toContain('<title>A <B>');
    expect(html).toContain('A &lt;B&gt; &amp; C');
  });

  it('builds one page per poster tile', () => {
    const doc = createSliceDoc(photo, {
      paper: 'A4',
      marginMm: 10,
      gutterMm: 4,
      showCutMarks: true,
      showLabels: true,
      showRuler: true,
    });
    const uri = 'data:image/jpeg;base64,x';
    const html = buildPosterHtml(doc, Array.from({ length: 9 }, () => uri));

    expect((html.match(/<section class="page">/g) ?? []).length).toBe(9);
    expect((html.match(/<img /g) ?? []).length).toBe(9);
    for (let row = 1; row <= 3; row += 1) {
      for (let col = 1; col <= 3; col += 1) {
        expect(html).toContain(`R${row}C${col}`);
      }
    }
    expect(html).toContain('1 / 9');
    expect(html).toContain('9 / 9');
  });

  it('builds a single contact sheet', () => {
    const doc = createSliceDoc(photo, {
      paper: 'A4',
      marginMm: 10,
      gutterMm: 4,
      showCutMarks: true,
      showLabels: false,
      showRuler: false,
    });
    const html = buildSheetHtml(
      { ...doc, mode: 'sheet' },
      Array.from({ length: 9 }, () => 'data:image/jpeg;base64,x'),
    );
    expect((html.match(/<section class="page">/g) ?? []).length).toBe(1);
    expect((html.match(/<img /g) ?? []).length).toBe(9);
  });

  it('builds an id sheet with the layout copy count', () => {
    const doc = createIdDoc(photo, { paper: '4R', showCutMarks: true, showRuler: false });
    const html = buildIdSheetHtml(doc, 'data:image/jpeg;base64,id');
    expect((html.match(/class="id-copy"/g) ?? []).length).toBe(4);
    // The image data URI is declared once in CSS, not once per copy.
    expect((html.match(/data:image\/jpeg;base64,id/g) ?? []).length).toBe(1);
    expect(html).toContain('Passport');
    expect(html).toContain('print at 100%');
  });
});
