/**
 * Print/PDF output for a Design Studio document. Pure string builder: the
 * caller resolves image layers to base64 data URIs first, then hands the result
 * to `printHtml` / `htmlToPdf` in lib/print/print.ts.
 *
 * Geometry is in millimetres end to end, so a printed design comes out at the
 * exact physical size chosen in the editor.
 */
import { roundTo } from '../../lib/format';
import type { Paper } from '../../lib/print/a4';
import { escapeHtml, printDocument } from '../../lib/print/html';
import { getPage, type Design, type EmojiLayer, type ImageLayer, type Layer, type ShapeLayer, type TextLayer } from './model';

const mm = (value: number): string => `${roundTo(value, 2)}mm`;

/** Print CSS is millimetre-accurate; only the page wrapper needs the real size. */
function paperFor(design: Design): Paper {
  const page = getPage(design.page);
  return {
    // The id is unused by the CSS builder (it reads label/w/h/cssSize); the
    // print pipeline only knows the four paper ids, so any of them will do.
    id: 'A4',
    label: page.label,
    w: page.wMm,
    h: page.hMm,
    cssSize: page.cssSize,
  };
}

/** Shared positioning for every layer. */
function boxStyle(layer: Layer): string {
  const parts = [
    'position:absolute',
    `left:${mm(layer.x)}`,
    `top:${mm(layer.y)}`,
    `width:${mm(layer.w)}`,
    `height:${mm(layer.h)}`,
  ];
  if (layer.rotation) parts.push(`transform:rotate(${roundTo(layer.rotation, 2)}deg)`, 'transform-origin:center center');
  if (layer.opacity < 1) parts.push(`opacity:${roundTo(Math.max(0, layer.opacity), 3)}`);
  return parts.join(';');
}

function textHtml(layer: TextLayer): string {
  const style = [
    boxStyle(layer),
    `font-size:${mm(layer.fontSize)}`,
    'line-height:1.18',
    `color:${layer.color}`,
    `font-weight:${layer.weight}`,
    `text-align:${layer.align}`,
    // Preserve typed newlines and wrap long words instead of overflowing.
    'white-space:pre-wrap',
    'overflow-wrap:break-word',
    'overflow:hidden',
  ].join(';');
  return `<div style="${style}">${escapeHtml(layer.text)}</div>`;
}

function shapeHtml(layer: ShapeLayer): string {
  const style = [boxStyle(layer)];

  if (layer.shape === 'line') {
    style.push(`border-top:${mm(Math.max(0.2, layer.strokeWidth || 0.4))} solid ${layer.fill}`);
    return `<div style="${style.join(';')}"></div>`;
  }

  style.push(`background:${layer.fill}`);
  style.push(`border-radius:${layer.shape === 'ellipse' ? '50%' : mm(layer.radius)}`);
  if (layer.strokeWidth > 0 && layer.stroke !== 'transparent') {
    style.push(`border:${mm(layer.strokeWidth)} solid ${layer.stroke}`);
  }
  return `<div style="${style.join(';')}"></div>`;
}

function emojiHtml(layer: EmojiLayer): string {
  const style = [
    boxStyle(layer),
    `font-size:${mm(layer.size)}`,
    `line-height:${mm(layer.h)}`,
    'text-align:center',
    'overflow:hidden',
  ].join(';');
  return `<div style="${style}">${escapeHtml(layer.emoji)}</div>`;
}

function imageHtml(layer: ImageLayer, dataUri?: string): string {
  const style = [boxStyle(layer), `object-fit:${layer.fit}`].join(';');
  if (!dataUri) {
    // Missing source (e.g. a design restored on another phone): draw a labelled
    // placeholder rather than an empty hole, so the print still makes sense.
    return `<div style="${boxStyle(layer)};background:#F5F9F7;border:0.3mm dashed #B9C4BF;display:flex;align-items:center;justify-content:center;font-size:3.2mm;color:#97A5A0">PHOTO</div>`;
  }
  return `<img src="${dataUri}" alt="" style="${style}" />`;
}

function layerHtml(layer: Layer, images: Record<string, string>): string {
  switch (layer.type) {
    case 'text':
      return textHtml(layer);
    case 'shape':
      return shapeHtml(layer);
    case 'emoji':
      return emojiHtml(layer);
    case 'image':
      return imageHtml(layer, images[layer.id]);
    default:
      return '';
  }
}

/**
 * A full print document for one design. `images` maps image-layer ids to
 * `data:image/...;base64,...` URIs; layers with no entry print as placeholders.
 */
export function buildDesignHtml(design: Design, images: Record<string, string> = {}): string {
  const page = getPage(design.page);
  const background = design.background || '#FFFFFF';
  const body = design.layers.map((layer) => layerHtml(layer, images)).join('');

  const extraCss = `.design-page{position:absolute;left:0;top:0;width:${mm(page.wMm)};height:${mm(
    page.hMm,
  )};overflow:hidden;background:${background};}`;

  return printDocument({
    title: design.title,
    paper: paperFor(design),
    body: `<section class="page"><div class="design-page">${body}</div></section>`,
    extraCss,
  });
}

/** Safe file name for a PDF export. */
export function designFileName(design: Design): string {
  const slug = design.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${slug || 'design'}.pdf`;
}
