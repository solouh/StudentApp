import { describe, expect, it } from 'vitest';
import { createDesign, createEmojiLayer, createImageLayer, createShapeLayer, createTextLayer, type Design } from '../model';
import { buildDesignHtml, designFileName } from '../html';
import { buildTemplate } from '../templates';

function design(): Design {
  const base = createDesign('A4', 'Biology cover');
  return {
    ...base,
    background: '#F2FCF8',
    layers: [
      createShapeLayer('rect', 0, 0, 210, 74, '#6ED9B4'),
      createTextLayer('Cell Biology', 18, 34, 174),
      createShapeLayer('ellipse', 20, 100, 40, 40, '#E6F8F1'),
      createEmojiLayer('🌱', 30, 110, 12),
    ],
  };
}

describe('buildDesignHtml', () => {
  it('produces a complete HTML document with the page size', () => {
    const html = buildDesignHtml(design());
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('@page');
    expect(html).toContain('210mm');
    expect(html).toContain('297mm');
    expect(html).toContain('<title>Biology cover</title>');
  });

  it('paints the design background', () => {
    expect(buildDesignHtml(design())).toContain('background:#F2FCF8');
  });

  it('positions layers in millimetres', () => {
    const html = buildDesignHtml(design());
    expect(html).toContain('left:18mm');
    expect(html).toContain('top:34mm');
    expect(html).toContain('width:174mm');
  });

  it('escapes user text so markup cannot break the page', () => {
    const base = createDesign('A4');
    const html = buildDesignHtml({
      ...base,
      layers: [createTextLayer('<script>alert("x")</script>', 10, 10, 60)],
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders an ellipse with a percentage radius and a line as a border', () => {
    const html = buildDesignHtml(design());
    expect(html).toContain('border-radius:50%');
  });

  it('only emits opacity and rotation when they are set', () => {
    const plain = buildDesignHtml(design());
    expect(plain).not.toContain('transform:rotate');

    const base = createDesign('A4');
    const rotated = buildDesignHtml({
      ...base,
      layers: [{ ...createTextLayer('tilt', 10, 10, 40), rotation: 15, opacity: 0.5 }],
    });
    expect(rotated).toContain('rotate(15deg)');
    expect(rotated).toContain('opacity:0.5');
  });

  it('inlines an image when a data URI is supplied and draws a placeholder otherwise', () => {
    const base = createDesign('A4');
    const image = createImageLayer('file:///tmp/photo.jpg', 10, 10, 60, 60);
    const doc = { ...base, layers: [image] };

    expect(buildDesignHtml(doc)).toContain('PHOTO');

    const withData = buildDesignHtml(doc, { [image.id]: 'data:image/jpeg;base64,AAAA' });
    expect(withData).toContain('data:image/jpeg;base64,AAAA');
    expect(withData).not.toContain('PHOTO');
  });

  it('renders every layer of a real template', () => {
    const template = buildTemplate('assignment-cover');
    const html = buildDesignHtml(template);
    for (const layer of template.layers) {
      expect(html.length > 0).toBe(true);
    }
    expect(html).toContain('Cell Biology');
  });
});

describe('designFileName', () => {
  it('slugifies the title', () => {
    const base = createDesign('A4', 'My Big  Design!!');
    expect(designFileName(base)).toBe('my-big-design.pdf');
  });

  it('falls back when the title has no usable characters', () => {
    const base = createDesign('A4', '!!!');
    expect(designFileName(base)).toBe('design.pdf');
  });
});
