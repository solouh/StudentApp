import { describe, expect, it } from 'vitest';
import { getPaper } from '../print/a4';
import {
  cutGridMarks,
  dashedRect,
  escapeHtml,
  imageTag,
  printDocument,
  rulerMm,
  sheetHeader,
} from '../print/html';

const PAGE_W = 210;
const PAGE_H = 297;

describe('escapeHtml', () => {
  it('escapes markup characters', () => {
    expect(escapeHtml('<b>"Tom" & Jerry\'s</b>')).toBe(
      '&lt;b&gt;&quot;Tom&quot; &amp; Jerry&#39;s&lt;/b&gt;',
    );
  });
});

describe('imageTag', () => {
  it('positions the image in millimetres', () => {
    const tag = imageTag({ dataUri: 'data:image/jpeg;base64,abc', rectMm: { x: 10, y: 20, w: 30, h: 40 } });
    expect(tag).toContain('left:10mm');
    expect(tag).toContain('top:20mm');
    expect(tag).toContain('width:30mm');
    expect(tag).toContain('height:40mm');
    expect(tag).toContain('object-fit:fill');
    expect(tag).toContain('data:image/jpeg;base64,abc');
  });

  it('supports rounded corners', () => {
    const tag = imageTag({ dataUri: 'x', rectMm: { x: 0, y: 0, w: 1, h: 1 }, roundedMm: 3 });
    expect(tag).toContain('border-radius:3mm');
  });
});

describe('cutGridMarks', () => {
  it('draws one line per unique grid edge', () => {
    const cells = [
      { x: 10, y: 10, w: 90, h: 90 },
      { x: 100, y: 10, w: 90, h: 90 },
      { x: 10, y: 100, w: 90, h: 90 },
      { x: 100, y: 100, w: 90, h: 90 },
    ];
    const html = cutGridMarks(cells);
    const vertical = html.match(/class="cut-v"/g) ?? [];
    const horizontal = html.match(/class="cut-h"/g) ?? [];
    expect(vertical).toHaveLength(3);
    expect(horizontal).toHaveLength(3);
  });

  it('returns nothing for an empty grid', () => {
    expect(cutGridMarks([])).toBe('');
  });
});

describe('dashedRect', () => {
  it('draws four edges', () => {
    const html = dashedRect({ x: 10, y: 10, w: 100, h: 50 });
    expect((html.match(/border-top:0.2mm dashed/g) ?? []).length).toBe(2);
    expect((html.match(/border-left:0.2mm dashed/g) ?? []).length).toBe(2);
  });
});

describe('rulerMm', () => {
  it('fits a 0-100 mm ruler on A4', () => {
    const html = rulerMm(getPaper('A4'));
    expect(html).toContain('class="ruler"');
    expect(html).toContain('width:100mm');
    // 11 ticks / labels for 0..100
    expect((html.match(/ruler-tick/g) ?? []).length).toBe(11);
  });

  it('shortens the ruler on a narrow 4R page', () => {
    const html = rulerMm(getPaper('4R'));
    expect(html).toContain('width:78mm');
  });
});

describe('sheetHeader', () => {
  it('escapes both labels', () => {
    const html = sheetHeader('A & B', '<1/9>');
    expect(html).toContain('A &amp; B');
    expect(html).toContain('&lt;1/9&gt;');
  });
});

describe('printDocument', () => {
  it('produces a full A4 document', () => {
    const html = printDocument({
      title: 'My <Poster>',
      paper: getPaper('A4'),
      body: '<section class="page"></section>',
    });
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<title>My &lt;Poster&gt;</title>');
    expect(html).toContain('size: A4 portrait');
    expect(html).toContain(`width: ${PAGE_W}mm`);
    expect(html).toContain(`height: ${PAGE_H}mm`);
    expect(html).toContain('page-break-after: always');
  });

  it('uses the 4R page size', () => {
    const html = printDocument({ title: 'ID', paper: getPaper('4R'), body: '' });
    expect(html).toContain('size: 102mm 152mm');
  });
});
