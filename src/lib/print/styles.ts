/**
 * Print-safe CSS. Physical geometry is expressed in millimetres so the system
 * print dialog (or `printToFileAsync` PDF) keeps true size.
 */
import type { Paper } from './a4';

export function baseCss(paper: Paper): string {
  return `
@page { size: ${paper.cssSize}; margin: 0; }
* { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0; background: #ffffff; color: #0E1A15;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
.page {
  position: relative;
  width: ${paper.w}mm;
  height: ${paper.h}mm;
  overflow: hidden;
  page-break-after: always;
  break-after: page;
  background: #ffffff;
}
.page:last-child { page-break-after: auto; break-after: auto; }
img { display: block; }
.sheet-header {
  position: absolute; left: 10mm; right: 10mm; top: 1.5mm;
  display: flex; justify-content: space-between;
  font-size: 6.5pt; letter-spacing: .3pt; color: #97A5A0;
}
.cell-label {
  position: absolute;
  font-size: 8pt; letter-spacing: .4pt; color: #5F6F69;
  background: rgba(255, 255, 255, 0.84);
  padding: 1mm 1.6mm; border-radius: 1.5mm;
}
.cut-v { position: absolute; width: 0; border-left: 0.2mm dashed #B9C4BF; }
.cut-h { position: absolute; height: 0; border-top: 0.2mm dashed #B9C4BF; }
.ruler { position: absolute; height: 9mm; }
.ruler-line { position: absolute; left: 0; right: 0; bottom: 0; border-top: 0.2mm solid #B9C4BF; }
.ruler-tick { position: absolute; bottom: 0; width: 0.2mm; height: 2.6mm; background: #B9C4BF; }
.ruler-label {
  position: absolute; bottom: 3mm; font-size: 5.5pt; color: #97A5A0;
  transform: translateX(-50%);
}
.muted { color: #97A5A0; }
`;
}
