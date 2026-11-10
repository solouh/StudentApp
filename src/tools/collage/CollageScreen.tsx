import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { HostInstance } from 'react-native';
import {
  DownloadIcon,
  PhotoIcon,
  PrinterIcon,
  ShareIcon,
} from '../../components/Icons';
import {
  ActionSheet,
  BusyOverlay,
  EmptyState,
  InlineNotice,
  OptionChip,
  SectionLabel,
  Stepper,
  TextField,
  ToggleRow,
  ToolButton,
  ToolScaffold,
  type SheetAction,
} from '../../components/tool-kit';
import { jpegDataUri, payloadFits } from '../../lib/print/dataUri';
import { htmlToPdf, printHtml } from '../../lib/print/print';
import { cropToPx } from '../../lib/media/crop-math';
import {
  capturePng,
  cropPhoto,
  pickPhotos,
  saveToGallery,
  toBase64,
  MAX_TILE_EDGE,
} from '../../lib/media/image';
import { getPaper, layoutCellsMm } from '../../lib/print/a4';
import { isSharingAvailable, shareImage, sharePdf } from '../../lib/share';
import { useToolSettings } from '../../lib/settings';
import { useBackHandler } from '../../lib/useBackHandler';
import { isExpoGo } from '../../lib/env';
import { ToolError } from '../../lib/errors';
import { colors, fonts, radius } from '../../theme';
import { useToolTasks } from '../useToolTasks';
import { CollagePreview } from './components/CollagePreview';
import { PhotoStrip } from './components/PhotoStrip';
import { AdjustCropModal } from './components/AdjustCropModal';
import {
  addPhotosToCollage,
  aspectAdjustedCrop,
  BACKGROUND_SWATCHES,
  cellAspectFor,
  clearCell,
  COLLAGE_PRESETS,
  createCollageDoc,
  filledCellCount,
  MAX_COLLAGE_PHOTOS,
  outputFileName,
  resizeCollageGrid,
  updateCellCrop,
  type CollageDoc,
} from './model';
import { buildCollageHtml, type CollagePrintImage } from './html';

const PAPER_OPTIONS = [
  { id: 'A4' as const, label: 'A4' },
  { id: 'A4L' as const, label: 'A4 landscape' },
  { id: '4R' as const, label: '4R photo' },
];

export default function CollageScreen({ onClose }: { onClose: () => void }) {
  const { width: windowWidth } = useWindowDimensions();
  const settings = useToolSettings();
  const { run, busy, notice, setNotice } = useToolTasks();

  const [doc, setDoc] = useState<CollageDoc>(() =>
    createCollageDoc({
      paper: 'A4',
      marginMm: 10,
      gutterMm: 4,
      radiusMm: 3,
      background: '#FFFFFF',
      showRuler: true,
      showCutMarks: true,
    }),
  );
  const [sharing, setSharing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [adjustIndex, setAdjustIndex] = useState<number | null>(null);
  const captureRef = useRef<HostInstance | null>(null);

  useBackHandler(
    useCallback(() => {
      onClose();
      return true;
    }, [onClose]),
  );

  useEffect(() => {
    void isSharingAvailable().then(setSharing);
  }, []);

  // Seed from remembered settings once they hydrate.
  useEffect(() => {
    if (!settings.hydrated) return;
    const saved = settings.value;
    setDoc((previous) => ({
      ...previous,
      paper: saved.paper,
      marginMm: saved.marginMm,
      gutterMm: saved.gutterMm,
      background: saved.background,
      showRuler: saved.showRuler,
      showCutMarks: saved.showCutMarks,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.hydrated]);

  // Remember layout choices for the next session.
  useEffect(() => {
    if (!settings.hydrated) return;
    settings.setValue((previous) => ({
      ...previous,
      paper: doc.paper,
      marginMm: doc.marginMm,
      gutterMm: doc.gutterMm,
      background: doc.background,
      showRuler: doc.showRuler,
      showCutMarks: doc.showCutMarks,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    doc.paper,
    doc.marginMm,
    doc.gutterMm,
    doc.background,
    doc.showRuler,
    doc.showCutMarks,
    settings.hydrated,
  ]);

  const paper = getPaper(doc.paper);
  const filled = filledCellCount(doc);
  const isWeb = Platform.OS === 'web';
  const previewWidth = Math.min(windowWidth - 48, 320);

  const cellAspect = useMemo(() => {
    try {
      return cellAspectFor(doc);
    } catch {
      return 1;
    }
  }, [doc.paper, doc.marginMm, doc.gutterMm, doc.rows, doc.cols]);

  const editCell = adjustIndex !== null ? doc.cells[adjustIndex] : null;

  const addPhotos = useCallback(() => {
    void run('Adding photos…', async () => {
      const current = filledCellCount(doc);
      const remaining = doc.cells.length - current;
      if (remaining <= 0) {
        setNotice({
          tone: 'info',
          message: 'All slots are filled. Use a bigger grid or remove a photo.',
        });
        return;
      }
      const limit = Math.min(remaining, MAX_COLLAGE_PHOTOS - current);
      if (limit <= 0) {
        setNotice({ tone: 'info', message: 'A collage holds up to 9 photos.' });
        return;
      }
      const photos = await pickPhotos(limit);
      if (!photos.length) return;
      setDoc((previous) => addPhotosToCollage(previous, photos));
    });
  }, [doc, run, setNotice]);

  const removePhoto = useCallback((index: number) => {
    setDoc((previous) => clearCell(previous, index));
  }, []);

  const applyCrop = useCallback(
    (crop: Parameters<typeof updateCellCrop>[2]) => {
      if (adjustIndex === null) return;
      setDoc((previous) => updateCellCrop(previous, adjustIndex, crop));
      setAdjustIndex(null);
    },
    [adjustIndex],
  );

  const collectImages = useCallback(
    async (maxEdge: number): Promise<{ images: CollagePrintImage[]; encoded: string[] }> => {
      const rects = layoutCellsMm({
        paper: getPaper(doc.paper),
        marginMm: doc.marginMm,
        gutterMm: doc.gutterMm,
        rows: doc.rows,
        cols: doc.cols,
      });
      const images: CollagePrintImage[] = [];
      const encoded: string[] = [];

      for (let index = 0; index < doc.cells.length; index += 1) {
        const cell = doc.cells[index];
        const rect = rects[index];
        const photo = cell?.photo;
        if (!photo || !rect) continue;

        const crop = aspectAdjustedCrop(photo, cell.crop, rect.w / rect.h);
        const px = cropToPx(crop, photo.width, photo.height);
        const tileUri = await cropPhoto(photo, px, maxEdge);
        const base64 = await toBase64(tileUri);
        encoded.push(base64);
        images.push({ dataUri: jpegDataUri(base64), rectMm: rect });
      }

      return { images, encoded };
    },
    [doc],
  );

  const buildPrintHtml = useCallback(async (): Promise<string> => {
    if (filledCellCount(doc) === 0) {
      throw new ToolError('image', 'Add at least one photo first.');
    }
    let { images, encoded } = await collectImages(MAX_TILE_EDGE);
    if (!payloadFits(encoded)) {
      ({ images, encoded } = await collectImages(1200));
    }
    if (!payloadFits(encoded)) {
      throw new ToolError('print', 'This sheet is too heavy to print. Try fewer photos.');
    }
    return buildCollageHtml(doc, images);
  }, [collectImages, doc]);

  const doPrint = useCallback(() => {
    void run('Opening print dialog…', async () => {
      const html = await buildPrintHtml();
      await printHtml(html);
      setNotice({
        tone: 'success',
        message: 'Print dialog opened. Choose a printer or save as PDF.',
      });
    });
  }, [buildPrintHtml, run, setNotice]);

  const doPdf = useCallback(() => {
    void run('Building PDF…', async () => {
      const html = await buildPrintHtml();
      const uri = await htmlToPdf(html, outputFileName('collage', doc.title));
      await sharePdf(uri, 'Share collage PDF');
    });
  }, [buildPrintHtml, doc.title, run]);

  const doPng = useCallback(() => {
    void run('Creating image…', async () => {
      const uri = await capturePng(captureRef, 1240, paper.w / paper.h);
      await shareImage(uri, 'Share collage');
    });
  }, [paper.h, paper.w, run]);

  const doSavePhotos = useCallback(() => {
    void run('Saving to Photos…', async () => {
      const uri = await capturePng(captureRef, 1240, paper.w / paper.h);
      await saveToGallery(uri);
      setNotice({ tone: 'success', message: 'Saved to your photos.' });
    });
  }, [paper.h, paper.w, run, setNotice]);

  const sheetActions: SheetAction[] = [
    {
      key: 'print',
      label: 'Print',
      caption: 'Opens the system print dialog',
      icon: <PrinterIcon size={19} color={colors.mintDark} />,
      onPress: doPrint,
    },
    {
      key: 'pdf',
      label: 'Share PDF',
      caption: 'Save to Files or send to a print shop',
      icon: <DownloadIcon size={19} color={colors.mintDark} />,
      onPress: doPdf,
      disabled: !sharing,
    },
    {
      key: 'png',
      label: 'Share image',
      caption: 'Send the sheet as a photo',
      icon: <ShareIcon size={19} color={colors.mintDark} />,
      onPress: doPng,
      disabled: !sharing,
    },
    {
      key: 'save',
      label: 'Save to Photos',
      caption: isExpoGo()
        ? 'Limited in Expo Go — Share works everywhere'
        : 'Keeps a PNG in your gallery',
      icon: <PhotoIcon size={19} color={colors.mintDark} />,
      onPress: doSavePhotos,
    },
  ];

  return (
    <ToolScaffold
      title="Collage studio"
      subtitle="Grid · print · share"
      onBack={onClose}
      footer={
        <ToolButton
          label={filled === 0 ? 'ADD PHOTOS TO START' : 'PRINT OR SHARE'}
          onPress={() => (filled === 0 ? addPhotos() : setSheetOpen(true))}
          disabled={busy !== null || isWeb}
        />
      }
    >
      {filled === 0 ? (
        <EmptyState
          title="Start with your photos"
          body="Pick up to 9 photos and they will fill the grid in order. Tap any cell later to zoom and reposition."
          actionLabel="CHOOSE PHOTOS"
          onAction={addPhotos}
        />
      ) : (
        <>
          <View style={styles.previewWrap}>
            <CollagePreview
              doc={doc}
              width={previewWidth}
              onCellPress={(index) => {
                if (doc.cells[index]?.photo) setAdjustIndex(index);
                else addPhotos();
              }}
              captureTargetRef={captureRef}
            />
          </View>
          <Text style={styles.previewHint}>
            {paper.label} · {doc.rows} × {doc.cols} · tap a photo to adjust
          </Text>
        </>
      )}

      {notice ? (
        <InlineNotice
          tone={notice.tone}
          message={notice.message}
          actionLabel={notice.actionLabel}
          onAction={notice.onAction}
        />
      ) : null}

      {isWeb ? (
        <InlineNotice message="Printing, sharing and saving run in the Expo Go app on your phone." />
      ) : null}

      <SectionLabel>1 · PHOTOS</SectionLabel>
      <View style={styles.panel}>
        <PhotoStrip
          cells={doc.cells}
          onAdd={addPhotos}
          onRemove={removePhoto}
          onEdit={(index) => setAdjustIndex(index)}
        />
      </View>

      <SectionLabel>2 · GRID</SectionLabel>
      <View style={styles.panel}>
        <View style={styles.chipRow}>
          {COLLAGE_PRESETS.map((preset) => (
            <OptionChip
              key={preset.label}
              label={preset.label}
              active={doc.rows === preset.rows && doc.cols === preset.cols}
              onPress={() => setDoc((previous) => resizeCollageGrid(previous, preset.rows, preset.cols))}
            />
          ))}
        </View>
        <View style={styles.divider} />
        <Stepper
          label="Rows"
          value={doc.rows}
          min={1}
          max={4}
          onChange={(rows) => setDoc((previous) => resizeCollageGrid(previous, rows, previous.cols))}
        />
        <Stepper
          label="Columns"
          value={doc.cols}
          min={1}
          max={4}
          onChange={(cols) => setDoc((previous) => resizeCollageGrid(previous, previous.rows, cols))}
        />
      </View>

      <SectionLabel>3 · STYLE</SectionLabel>
      <View style={styles.panel}>
        <Text style={styles.subLabel}>PAPER</Text>
        <View style={styles.chipRow}>
          {PAPER_OPTIONS.map((option) => (
            <OptionChip
              key={option.id}
              label={option.label}
              active={doc.paper === option.id}
              onPress={() => setDoc((previous) => ({ ...previous, paper: option.id }))}
            />
          ))}
        </View>

        <Text style={styles.subLabel}>BACKGROUND</Text>
        <View style={styles.swatchRow}>
          {BACKGROUND_SWATCHES.map((swatch) => {
            const active = doc.background === swatch.color;
            return (
              <Pressable
                key={swatch.id}
                onPress={() => setDoc((previous) => ({ ...previous, background: swatch.color }))}
                accessibilityRole="button"
                accessibilityLabel={`${swatch.label} background`}
                accessibilityState={{ selected: active }}
                style={[styles.swatch, { backgroundColor: swatch.color }, active && styles.swatchActive]}
              />
            );
          })}
        </View>

        <View style={styles.divider} />
        <Stepper
          label="Margin"
          value={doc.marginMm}
          min={0}
          max={20}
          suffix="mm"
          onChange={(marginMm) => setDoc((previous) => ({ ...previous, marginMm }))}
        />
        <Stepper
          label="Gutter"
          value={doc.gutterMm}
          min={0}
          max={12}
          suffix="mm"
          onChange={(gutterMm) => setDoc((previous) => ({ ...previous, gutterMm }))}
        />
        <Stepper
          label="Rounded corners"
          value={doc.radiusMm}
          min={0}
          max={12}
          suffix="mm"
          onChange={(radiusMm) => setDoc((previous) => ({ ...previous, radiusMm }))}
        />
      </View>

      <SectionLabel>4 · FINISH</SectionLabel>
      <View style={styles.panel}>
        <TextField
          label="Print name"
          value={doc.title}
          onChangeText={(title) => setDoc((previous) => ({ ...previous, title }))}
          placeholder="My collage"
        />
        <View style={styles.divider} />
        <ToggleRow
          label="Cut guides"
          caption="Dashed lines in the gutters"
          value={doc.showCutMarks}
          onChange={(showCutMarks) => setDoc((previous) => ({ ...previous, showCutMarks }))}
        />
        <ToggleRow
          label="Scale ruler"
          caption="10 cm check on the printed page"
          value={doc.showRuler}
          onChange={(showRuler) => setDoc((previous) => ({ ...previous, showRuler }))}
        />
        <ToggleRow
          label="Photo numbers"
          caption="Label each picture with its caption"
          value={doc.showCaptions}
          onChange={(showCaptions) => setDoc((previous) => ({ ...previous, showCaptions }))}
        />
        {doc.showCaptions ? (
          <TextField
            label="Caption"
            value={doc.caption}
            onChangeText={(caption) => setDoc((previous) => ({ ...previous, caption }))}
            placeholder="Photo"
          />
        ) : null}
      </View>

      <View style={styles.tipRow}>
        <Text style={styles.tipText}>
          Tip: choose “Actual size” and A4 in the print dialog so the ruler and
          cut lines line up.
        </Text>
      </View>

      <ActionSheet
        visible={sheetOpen}
        title="Print your collage"
        message={`${filled} photo${filled === 1 ? '' : 's'} · ${paper.label}`}
        actions={sheetActions}
        onClose={() => setSheetOpen(false)}
      />

      <BusyOverlay
        visible={busy !== null}
        message={busy ?? 'Working…'}
        hint="Photos are processed on this phone."
      />

      <AdjustCropModal
        visible={adjustIndex !== null && editCell?.photo !== null && editCell?.photo !== undefined}
        photo={editCell?.photo ?? null}
        aspect={cellAspect}
        crop={editCell?.crop ?? { x: 0, y: 0, w: 1, h: 1 }}
        onCancel={() => setAdjustIndex(null)}
        onSave={applyCrop}
      />
    </ToolScaffold>
  );
}

const styles = StyleSheet.create({
  previewWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  previewHint: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  panel: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#F1F5F2',
    padding: 14,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subLabel: {
    fontFamily: fonts.semibold,
    fontSize: 9,
    letterSpacing: 1.4,
    color: colors.muted,
    marginBottom: 8,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E3EBE7',
  },
  swatchActive: {
    borderWidth: 2.5,
    borderColor: colors.ink,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 10,
  },
  tipRow: {
    marginTop: 14,
  },
  tipText: {
    fontFamily: fonts.regular,
    fontSize: 10,
    lineHeight: 15,
    color: colors.muted,
  },
});
