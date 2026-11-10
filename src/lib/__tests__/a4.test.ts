import { describe, expect, it } from 'vitest';
import { cellAspectMm, contentBoxMm, fitMm, getPaper, layoutCellsMm, PAPERS } from '../print/a4';

describe('paper sizes', () => {
  it('exposes the expected millimetre sizes', () => {
    expect(PAPERS.A4.w).toBe(210);
    expect(PAPERS.A4.h).toBe(297);
    expect(PAPERS.A4L.w).toBe(297);
    expect(PAPERS['4R'].w).toBe(102);
    expect(PAPERS['4R'].h).toBe(152);
  });

  it('falls back to A4 for unknown ids', () => {
    expect(getPaper('nope' as never).id).toBe('A4');
  });
});

describe('contentBoxMm', () => {
  it('insets by the margin', () => {
    const box = contentBoxMm(getPaper('A4'), 10);
    expect(box).toEqual({ x: 10, y: 10, w: 190, h: 277 });
  });

  it('caps a too-large margin', () => {
    const box = contentBoxMm(getPaper('A4'), 500);
    expect(box.w).toBeGreaterThan(0);
    expect(box.h).toBeGreaterThan(0);
  });
});

describe('layoutCellsMm', () => {
  it('lays out a 2x2 grid with gutters inside the margins', () => {
    const cells = layoutCellsMm({
      paper: getPaper('A4'),
      marginMm: 10,
      gutterMm: 4,
      rows: 2,
      cols: 2,
    });

    expect(cells).toHaveLength(4);
    const [first, second, third, fourth] = cells;
    expect(first.x).toBe(10);
    expect(first.y).toBe(10);
    expect(second.x - (first.x + first.w)).toBeCloseTo(4, 6);
    expect(third.y - (first.y + first.h)).toBeCloseTo(4, 6);
    expect(fourth.x + fourth.w).toBeCloseTo(200, 6);
    expect(fourth.y + fourth.h).toBeCloseTo(287, 6);
    for (const cell of cells) {
      expect(cell.w).toBeGreaterThan(0);
      expect(cell.h).toBeGreaterThan(0);
    }
  });

  it('handles no gutter', () => {
    const cells = layoutCellsMm({
      paper: getPaper('4R'),
      marginMm: 0,
      gutterMm: 0,
      rows: 1,
      cols: 2,
    });
    expect(cells[0].w).toBeCloseTo(51, 6);
    expect(cells[1].x).toBeCloseTo(51, 6);
  });

  it('throws when the grid does not fit', () => {
    expect(() =>
      layoutCellsMm({
        paper: getPaper('4R'),
        marginMm: 60,
        gutterMm: 10,
        rows: 4,
        cols: 4,
      }),
    ).toThrow();
  });

  it('rejects invalid grid counts', () => {
    expect(() =>
      layoutCellsMm({ paper: getPaper('A4'), marginMm: 10, gutterMm: 4, rows: 0, cols: 2 }),
    ).toThrow();
  });
});

describe('cellAspectMm', () => {
  it('matches the physical cell ratio', () => {
    const aspect = cellAspectMm({
      paper: getPaper('A4'),
      marginMm: 10,
      gutterMm: 0,
      rows: 2,
      cols: 2,
    });
    expect(aspect).toBeCloseTo(190 / 277, 6);
  });
});

describe('fitMm', () => {
  it('centers a fitted image', () => {
    const fit = fitMm(400, 200, { x: 10, y: 10, w: 100, h: 100 });
    expect(fit.w).toBe(100);
    expect(fit.h).toBe(50);
    expect(fit.x).toBe(10);
    expect(fit.y).toBe(35);
  });
});
