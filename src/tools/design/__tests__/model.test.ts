import { describe, expect, it } from 'vitest';
import {
  addLayer,
  bringToFront,
  canvasHeightPx,
  clampLayer,
  createDesign,
  createEmojiLayer,
  createShapeLayer,
  createTextLayer,
  duplicateLayer,
  getPage,
  hitTest,
  MIN_SIZE_MM,
  moveLayer,
  PAGES,
  removeLayer,
  reorderLayer,
  scaleFor,
  sendToBack,
  setPage,
  updateLayer,
  type Design,
} from '../model';
import { buildTemplate, getTemplate, TEMPLATES } from '../templates';

function designWithText(): Design {
  const design = createDesign('A4');
  return addLayer(design, createTextLayer('Hello', 10, 10, 60));
}

describe('pages', () => {
  it('exposes positive, well-formed sizes', () => {
    for (const page of Object.values(PAGES)) {
      expect(page.wMm > 0).toBe(true);
      expect(page.hMm > 0).toBe(true);
      expect(page.cssSize.length > 0).toBe(true);
    }
  });

  it('maps screen pixels to millimetres', () => {
    const page = getPage('A4');
    const scale = scaleFor(page, 350);
    expect(scale).toBeCloseTo(350 / 210);
    expect(canvasHeightPx(page, 350)).toBeCloseTo(350 * (297 / 210));
  });
});

describe('createDesign', () => {
  it('starts empty with a unique id', () => {
    const a = createDesign('A4');
    const b = createDesign('A4');
    expect(a.layers).toHaveLength(0);
    expect(a.id).not.toBe(b.id);
    expect(a.page).toBe('A4');
    expect(a.background).toBe('#FFFFFF');
  });
});

describe('addLayer and hit testing', () => {
  it('adds a layer on the page', () => {
    const design = designWithText();
    expect(design.layers).toHaveLength(1);
    expect(design.layers[0].type).toBe('text');
  });

  it('finds the topmost layer under a point', () => {
    let design = createDesign('A4');
    design = addLayer(design, createShapeLayer('rect', 10, 10, 80, 80));
    design = addLayer(design, createShapeLayer('ellipse', 20, 20, 40, 40));

    const top = hitTest(design, 25, 25);
    expect(top?.type).toBe('shape');
    expect(top?.id).toBe(design.layers[1].id);
  });

  it('returns null outside every layer', () => {
    expect(hitTest(designWithText(), 200, 280)).toBeNull();
  });

  it('never selects a locked layer', () => {
    let design = createDesign('A4');
    const shape = createShapeLayer('rect', 10, 10, 80, 80);
    design = addLayer(design, { ...shape, locked: true });
    expect(hitTest(design, 30, 30)).toBeNull();
  });
});

describe('clamping', () => {
  it('keeps layers on the page and enforces a minimum size', () => {
    const page = getPage('A4');
    const tiny = clampLayer(createTextLayer('x', 500, 500, 1), page);
    expect(tiny.w >= MIN_SIZE_MM).toBe(true);
    expect(tiny.x + tiny.w <= page.wMm + 0.001).toBe(true);
    expect(tiny.y + tiny.h <= page.hMm + 0.001).toBe(true);
  });

  it('does not let a layer escape when dragged past the edge', () => {
    let design = designWithText();
    const id = design.layers[0].id;
    design = moveLayer(design, id, 1000, 1000);
    const layer = design.layers[0];
    expect(layer.x + layer.w <= getPage('A4').wMm + 0.001).toBe(true);
    expect(layer.y + layer.h <= getPage('A4').hMm + 0.001).toBe(true);
  });
});

describe('mutations', () => {
  it('updates only the target layer', () => {
    let design = designWithText();
    design = addLayer(design, createTextLayer('Second', 10, 100, 60));
    const [first, second] = design.layers;
    design = updateLayer(design, second.id, { text: 'Changed', fontSize: 9 });

    expect(design.layers[0]).toEqual(first);
    expect(design.layers[1]).toMatchObject({ text: 'Changed', fontSize: 9 });
  });

  it('removes layers by id', () => {
    const design = designWithText();
    const id = design.layers[0].id;
    expect(removeLayer(design, id).layers).toHaveLength(0);
  });

  it('duplicates above the original with an offset and a new id', () => {
    const design = designWithText();
    const original = design.layers[0];
    const { design: next, layerId } = duplicateLayer(design, original.id);

    expect(next.layers).toHaveLength(2);
    expect(next.layers[1].id).toBe(layerId);
    expect(next.layers[1].id).not.toBe(original.id);
    expect(next.layers[1].x).toBe(original.x + 4);
    expect(next.layers[1].name).toContain('copy');
  });

  it('reorders layers without losing any', () => {
    let design = createDesign('A4');
    design = addLayer(design, createTextLayer('a', 5, 5, 30));
    design = addLayer(design, createTextLayer('b', 5, 40, 30));
    design = addLayer(design, createTextLayer('c', 5, 80, 30));
    const ids = design.layers.map((layer) => layer.id);

    const front = bringToFront(design, ids[0]);
    expect(front.layers.map((layer) => layer.id)).toEqual([ids[1], ids[2], ids[0]]);

    const back = sendToBack(design, ids[2]);
    expect(back.layers.map((layer) => layer.id)).toEqual([ids[2], ids[0], ids[1]]);

    const one = reorderLayer(design, ids[0], 1);
    expect(one.layers.map((layer) => layer.id)).toEqual([ids[1], ids[0], ids[2]]);
  });

  it('ignores reorder requests for unknown ids', () => {
    const design = designWithText();
    expect(reorderLayer(design, 'nope', 1)).toEqual(design);
  });

  it('re-clamps layers when the page changes', () => {
    let design = createDesign('A4');
    design = addLayer(design, createTextLayer('wide', 150, 250, 55));
    const small = setPage(design, 'card');
    const page = getPage('card');
    for (const layer of small.layers) {
      expect(layer.x + layer.w <= page.wMm + 0.001).toBe(true);
      expect(layer.y + layer.h <= page.hMm + 0.001).toBe(true);
    }
  });
});

describe('templates', () => {
  it('has unique ids and builds valid documents', () => {
    const ids = TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const template of TEMPLATES) {
      const design = template.build();
      const page = getPage(design.page);
      expect(design.title.length > 0).toBe(true);
      expect(design.id.length > 0).toBe(true);

      const layerIds = design.layers.map((layer) => layer.id);
      expect(new Set(layerIds).size).toBe(layerIds.length);

      for (const layer of design.layers) {
        expect(layer.x >= 0).toBe(true);
        expect(layer.y >= 0).toBe(true);
        expect(layer.x + layer.w <= page.wMm + 0.001).toBe(true);
        expect(layer.y + layer.h <= page.hMm + 0.001).toBe(true);
        expect(layer.w > 0).toBe(true);
        expect(layer.h > 0).toBe(true);
      }
    }
  });

  it('falls back to a blank page for an unknown template', () => {
    const design = buildTemplate('does-not-exist');
    expect(design.layers).toHaveLength(0);
    expect(design.page).toBe('A4');
    expect(getTemplate('does-not-exist')).toBeUndefined();
  });

  it('builds a fresh document each time', () => {
    const template = TEMPLATES[0];
    expect(template.build().id).not.toBe(template.build().id);
  });

  it('includes an emoji layer in the wallpaper template', () => {
    const design = buildTemplate('phone-wallpaper');
    expect(design.layers.some((layer) => layer.type === 'emoji')).toBe(true);
    const emoji = createEmojiLayer('🌱', 1, 1, 10);
    expect(emoji.size).toBe(10);
  });
});
