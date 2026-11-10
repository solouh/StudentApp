/**
 * Print HTML for the three print tools. All input images are already cropped to
 * the exact aspect they are placed at, so the document only positions them in
 * millimetres (no WebView-specific object-fit tricks).
 */
import { rowColumnLabel, roundTo, shortDate } from '../../lib/format';
import {
  contentBoxMm,
  fitMm,
  getPaper,
  layoutCellsMm,
  type RectMm,
} from '../../lib/print/a4';
import {
  cellLabel,
  cutGridMarks,
  dashedRect,
  imageTag,
  page,
  printDocument,
  rulerMm,
  sheetHeader,
} from '../../lib/print/html';
import type { CollageDoc, IdDoc, SliceDoc } from './model';
import { idSheetLayout, posterTileRect, sliceTilesFor } from './model';

export type CollagePrintImage = { dataUri: string; rectMm: RectMm };

/** Collage sheet: background, optional cut guides, photos, labels, ruler. */
export function buildCollageHtml(doc: CollageDoc, images: CollagePrintImage[]): string {
  const paper = getPaper(doc.paper);

  const background =
    '<div style="position:absolute;left:0;top:0;right:0;bottom:0;' +
    `background:${doc.background};"></div>`;

  // Guides are painted under the photos, so only the gutter/margin parts show.
  const guides =
    doc.showCutMarks && doc.gutterMm >= 1
      ? cutGridMarks(
          images.map((image) => image.rectMm),
          { bleedMm: 3 },
        )
      : '';

  const pictures = images
    .map((image) =>
      imageTag({ dataUri: image.dataUri, rectMm: image.rectMm, roundedMm: doc.radiusMm }),
    )
    .join('');

  const captions = doc.showCaptions
    ? images
        .map((image, index) =>
          cellLabel(
            doc.caption ? `${doc.caption} ${index + 1}` : `Photo ${index + 1}`,
            image.rectMm,
          ),
        )
        .join('')
    : '';

  const header = sheetHeader(`${doc.title} · ${doc.rows} × ${doc.cols}`, shortDate());
  const ruler = doc.showRuler && doc.paper !== '4R' ? rulerMm(paper) : '';

  return printDocument({
    title: doc.title,
    paper,
    body: page(`${background}${guides}${pictures}${captions}${header}${ruler}`),
  });
}

/**
 * Poster mode: one tile per page, centered and scaled so tiles join edge to
 * edge. `tileDataUris[i]` is the (optionally bleed-expanded) crop of tile `i`.
 */
export function buildPosterHtml(doc: SliceDoc, tileDataUris: string[]): string {
  const paper = getPaper(doc.paper);
  const content = contentBoxMm(paper, doc.marginMm);
  const tiles = sliceTilesFor(doc);

  const pages = tiles.map((tile, index) => {
    const row = Math.floor(index / doc.cols);
    const col = index % doc.cols;

    const scale = Math.min(content.w / tile.width, content.h / tile.height);
    const tileWmm = tile.width * scale;
    const tileHmm = tile.height * scale;
    const tileX = content.x + (content.w - tileWmm) / 2;
    const tileY = content.y + (content.h - tileHmm) / 2;

    const expanded = posterTileRect(doc, index, tileWmm);
    const mmPerPx = tileWmm / tile.width;
    const imageRect: RectMm = {
      x: tileX + (expanded.originX - tile.originX) * mmPerPx,
      y: tileY + (expanded.originY - tile.originY) * mmPerPx,
      w: expanded.width * mmPerPx,
      h: expanded.height * mmPerPx,
    };

    const picture = tileDataUris[index]
      ? imageTag({ dataUri: tileDataUris[index], rectMm: imageRect })
      : '';
    const trim =
      doc.overlapMm > 0
        ? dashedRect({ x: tileX, y: tileY, w: tileWmm, h: tileHmm })
        : '';

    const header = sheetHeader(
      doc.showLabels ? `${doc.title} · ${rowColumnLabel(row, col)}` : doc.title,
      `${index + 1} / ${tiles.length}`,
    );
    const ruler = index === 0 && doc.showRuler ? rulerMm(paper) : '';

    return page(`${picture}${trim}${header}${ruler}`);
  });

  return printDocument({ title: doc.title, paper, body: pages.join('') });
}

/** Contact-sheet mode: every tile on one page, plus cut guides. */
export function buildSheetHtml(doc: SliceDoc, tileDataUris: string[]): string {
  const paper = getPaper(doc.paper);
  const cells = layoutCellsMm({
    paper,
    marginMm: doc.marginMm,
    gutterMm: Math.max(1, doc.gutterMm),
    rows: doc.rows,
    cols: doc.cols,
  });
  const tiles = sliceTilesFor(doc);

  const cut = doc.showCutMarks ? cutGridMarks(cells, { bleedMm: 3 }) : '';

  const pictures = tiles
    .map((tile, index) => {
      const cell = cells[index];
      const dataUri = tileDataUris[index];
      if (!cell || !dataUri) return '';
      return imageTag({ dataUri, rectMm: fitMm(tile.width, tile.height, cell) });
    })
    .join('');

  const labels = doc.showLabels
    ? cells
        .map((cell, index) =>
          cellLabel(
            rowColumnLabel(Math.floor(index / doc.cols), index % doc.cols),
            cell,
          ),
        )
        .join('')
    : '';

  const header = sheetHeader(`${doc.title} · contact sheet`, shortDate());
  const ruler = doc.showRuler ? rulerMm(paper) : '';

  return printDocument({
    title: doc.title,
    paper,
    body: page(`${cut}${pictures}${labels}${header}${ruler}`),
  });
}

/** ID / passport sheet: N copies of one cropped photo with cut guides. */
export function buildIdSheetHtml(doc: IdDoc, dataUri: string): string {
  const paper = getPaper(doc.paper);
  const rects = idSheetLayout(doc.size, doc.paper, doc.copies, doc.gutterMm);

  // The same image is repeated for every copy, so the data URI is declared once
  // in CSS instead of inlined in every element (keeps the HTML small).
  const copyCss = `.id-copy{position:absolute;background-image:url("${dataUri}");background-size:100% 100%;background-repeat:no-repeat;}`;
  const pictures = rects
    .map(
      (rect) =>
        `<div class="id-copy" style="left:${roundTo(rect.x, 2)}mm;top:${roundTo(
          rect.y,
          2,
        )}mm;width:${roundTo(rect.w, 2)}mm;height:${roundTo(rect.h, 2)}mm;"></div>`,
    )
    .join('');

  const cut = doc.showCutMarks ? cutGridMarks(rects, { bleedMm: 2 }) : '';
  const header = sheetHeader(
    `${doc.title} · ${doc.size.label}`,
    `${rects.length} copies · print at 100%`,
  );
  const ruler = doc.showRuler && doc.paper === 'A4' ? rulerMm(paper) : '';

  return printDocument({
    title: doc.title,
    paper,
    body: page(`${cut}${pictures}${header}${ruler}`),
    extraCss: copyCss,
  });
}
