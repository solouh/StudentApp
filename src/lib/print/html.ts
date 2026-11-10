/**
 * Pure HTML builders for print documents. No Expo imports: the output is handed
 * to expo-print by `src/lib/print/print.ts`.
 */
import { roundTo } from '../format';
import type { Paper, RectMm } from './a4';
import { baseCss } from './styles';

export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const fmt = (mm: number): string => `${roundTo(mm, 2)}mm`;

export type ImagePlacement = {
  dataUri: string;
  rectMm: RectMm;
  alt?: string;
  roundedMm?: number;
};

/** Absolutely positioned image; `object-fit: fill` is exact because the source
 *  has already been cropped to the placement's aspect ratio. */
export function imageTag({ dataUri, rectMm, alt = '', roundedMm = 0 }: ImagePlacement): string {
  const radius = roundedMm > 0 ? `border-radius:${fmt(roundedMm)};` : '';
  return `<img src="${dataUri}" alt="${escapeHtml(alt)}" style="position:absolute;left:${fmt(
    rectMm.x,
  )};top:${fmt(rectMm.y)};width:${fmt(rectMm.w)};height:${fmt(rectMm.h)};object-fit:fill;${radius}" />`;
}

export type CutOptions = {
  bleedMm?: number;
  color?: string;
};

/**
 * Dashed cut lines along every unique cell edge, extended past the grid so
 * scissors have a starting point.
 */
export function cutGridMarks(rects: RectMm[], { bleedMm = 4 }: CutOptions = {}): string {
  if (!rects.length) return '';

  const xs = new Set<string>();
  const ys = new Set<string>();
  const minX = Math.min(...rects.map((r) => r.x));
  const maxX = Math.max(...rects.map((r) => r.x + r.w));
  const minY = Math.min(...rects.map((r) => r.y));
  const maxY = Math.max(...rects.map((r) => r.y + r.h));

  for (const rect of rects) {
    xs.add(String(roundTo(rect.x, 2)));
    xs.add(String(roundTo(rect.x + rect.w, 2)));
    ys.add(String(roundTo(rect.y, 2)));
    ys.add(String(roundTo(rect.y + rect.h, 2)));
  }

  const vertical = [...xs]
    .map(
      (x) =>
        `<div class="cut-v" style="left:${x}mm;top:${fmt(minY - bleedMm)};height:${fmt(
          maxY - minY + bleedMm * 2,
        )};"></div>`,
    )
    .join('');
  const horizontal = [...ys]
    .map(
      (y) =>
        `<div class="cut-h" style="top:${y}mm;left:${fmt(minX - bleedMm)};width:${fmt(
          maxX - minX + bleedMm * 2,
        )};"></div>`,
    )
    .join('');

  return vertical + horizontal;
}

export function cutRectMarks(rect: RectMm, bleedMm = 3): string {
  return cutGridMarks([rect], { bleedMm });
}

/** Dashed rectangle exactly on a rect's four edges (trim guides). */
export function dashedRect(rect: RectMm, color = '#B9C4BF'): string {
  return [
    `<div style="position:absolute;left:${fmt(rect.x)};top:${fmt(rect.y)};width:${fmt(
      rect.w,
    )};height:0;border-top:0.2mm dashed ${color};"></div>`,
    `<div style="position:absolute;left:${fmt(rect.x)};top:${fmt(rect.y + rect.h)};width:${fmt(
      rect.w,
    )};height:0;border-top:0.2mm dashed ${color};"></div>`,
    `<div style="position:absolute;left:${fmt(rect.x)};top:${fmt(rect.y)};width:0;height:${fmt(
      rect.h,
    )};border-left:0.2mm dashed ${color};"></div>`,
    `<div style="position:absolute;left:${fmt(rect.x + rect.w)};top:${fmt(rect.y)};width:0;height:${fmt(
      rect.h,
    )};border-left:0.2mm dashed ${color};"></div>`,
  ].join('');
}

/** 0-100 mm calibration ruler: print at 100% and measure to confirm scale. */
export function rulerMm(paper: Paper, lengthMm?: number): string {
  const maxLength = Math.max(20, paper.w - 24);
  const length = Math.min(lengthMm ?? 100, maxLength);
  const steps = Math.round(length / 10);
  const ticks: string[] = [];

  for (let index = 0; index <= steps; index += 1) {
    const position = roundTo((index * length) / steps, 2);
    ticks.push(`<div class="ruler-tick" style="left:${fmt(position)};"></div>`);
    ticks.push(`<div class="ruler-label" style="left:${fmt(position)};">${position}</div>`);
  }

  return `<div class="ruler" style="left:10mm;bottom:1mm;width:${fmt(length)};">
    <div class="ruler-line"></div>${ticks.join('')}
  </div>`;
}

export function sheetHeader(left: string, right?: string): string {
  return `<div class="sheet-header"><span>${escapeHtml(left)}</span><span>${escapeHtml(
    right ?? '',
  )}</span></div>`;
}

export function cellLabel(text: string, rect: RectMm): string {
  return `<div class="cell-label" style="left:${fmt(rect.x + 2)};top:${fmt(
    rect.y + 2,
  )};">${escapeHtml(text)}</div>`;
}

export function page(content: string): string {
  return `<section class="page">${content}</section>`;
}

export type DocumentOptions = {
  title: string;
  paper: Paper;
  body: string;
  extraCss?: string;
};

export function printDocument({ title, paper, body, extraCss = '' }: DocumentOptions): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>${baseCss(paper)}${extraCss}</style>
</head>
<body>${body}</body>
</html>`;
}
