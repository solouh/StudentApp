import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  DownloadIcon,
  PhotoIcon,
  PrinterIcon,
  ScissorsIcon,
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
import { isValidGrid } from '../../lib/media/crop-math';
import { cropPhoto, pickPhotos, saveToGallery, toBase64 } from '../../lib/media/image';
import type { Photo } from '../../lib/media/types';
import { contentBoxMm, fitMm, getPaper } from '../../lib/print/a4';
import { jpegDataUri, payloadFits } from '../../lib/print/dataUri';
import { htmlToPdf, printHtml } from '../../lib/print/print';
import { isSharingAvailable, sharePdf } from '../../lib/share';
import { useToolSettings } from '../../lib/settings';
import { useBackHandler } from '../../lib/useBackHandler';
import { isExpoGo } from '../../lib/env';
import { ToolError } from '../../lib/errors';
import { colors, fonts, radius } from '../../theme';
import { useToolTasks } from '../useToolTasks';
import { buildPosterHtml, buildSheetHtml } from './html';
import {
  createSliceDoc,
  outputFileName,
  posterTileRect,
  SLICE_PRESETS,
  sliceTilesFor,
  type SliceDoc,
} from './model';

const PAPER_OPTIONS = [
  { id: 'A4' as const, label: 'A4 portrait' },
  { id: 'A4L' as const, label: 'A4 landscape' },
  { id: 'Letter' as const, label: 'Letter' },
];

export default function SliceScreen({ onClose }: { onClose: () => void }) {
  const { width: windowWidth } = useWindowDimensions();
  const settings = useToolSettings();
  const { run, busy, notice, setNotice } = useToolTasks();

  const [photo, setPhoto] = useState<Photo | null>(null);
  const [doc, setDoc] = useState<SliceDoc | null>(null);
  const [sharing, setSharing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isWeb = Platform.OS === 'web';

  useBackHandler(
    useCallback(() => {
      onClose();
      return true;
    }, [onClose]),
  );

  useEffect(() => {
    void isSharingAvailable().then(setSharing);
  }, []);

  const pickOne = useCallback(() => {
    void run('Loading photo…', async () => {
      const photos = await pickPhotos(1);
      if (!photos.length) return;
      const next = photos[0];
      setPhoto(next);
      setDoc(
        createSliceDoc(next, {
          paper: settings.value.paper,
          marginMm: settings.value.marginMm,
          gutterMm: settings.value.gutterMm,
          showCutMarks: settings.value.showCutMarks,
          showLabels: settings.value.showLabels,
          showRuler: settings.value.showRuler,
        }),
      );
    });
  }, [run, settings.value]);

  const patch = useCallback((changes: Partial<SliceDoc>) => {
    setDoc((previous) => (previous ? { ...previous, ...changes } : previous));
  }, []);

  const gridOk = useMemo(
    () => (doc ? isValidGrid(doc.photo.width, doc.photo.height, doc.rows, doc.cols) : false),
    [doc],
  );

  const tileCount = doc ? doc.rows * doc.cols : 0;

  const previewWidth = Math.min(windowWidth - 48, 330);
  const previewHeight = Math.min(300, previewWidth * 0.9);

  const previewFit = useMemo(() => {
    if (!photo) return { x: 0, y: 0, w: 1, h: 1 };
    const scale = Math.min(previewWidth / photo.width, previewHeight / photo.height);
    const w = photo.width * scale;
    const h = photo.height * scale;
    return { x: (previewWidth - w) / 2, y: (previewHeight - h) / 2, w, h };
  }, [photo, previewWidth, previewHeight]);

  const collectTiles = useCallback(
    async (maxEdge: number): Promise<{ uris: string[]; encoded: string[] }> => {
      if (!doc) throw new ToolError('image', 'Choose a photo first.');
      if (!isValidGrid(doc.photo.width, doc.photo.height, doc.rows, doc.cols)) {
        throw new ToolError('grid', 'This grid is too fine for the selected photo.');
      }

      const tiles = sliceTilesFor(doc);
      const content = contentBoxMm(getPaper(doc.paper), doc.marginMm);
      const uris: string[] = [];
      const encoded: string[] = [];

      for (let index = 0; index < tiles.length; index += 1) {
        const tile = tiles[index];
        let rect = tile;
        if (doc.mode === 'poster' && doc.overlapMm > 0) {
          const printSize = fitMm(tile.width, tile.height, content);
          rect = posterTileRect(doc, index, printSize.w);
        }
        const uri = await cropPhoto(doc.photo, rect, maxEdge);
        uris.push(uri);
        encoded.push(await toBase64(uri));
      }

      return { uris, encoded };
    },
    [doc],
  );

  const buildHtml = useCallback(async (): Promise<string> => {
    if (!doc) throw new ToolError('image', 'Choose a photo first.');
    let { uris, encoded } = await collectTiles(1800);
    if (!payloadFits(encoded)) {
      ({ uris, encoded } = await collectTiles(1100));
    }
    if (!payloadFits(encoded)) {
      throw new ToolError('print', 'This poster is too heavy to render. Try fewer tiles.');
    }
    const dataUris = uris.map((_, index) => jpegDataUri(encoded[index]));
    return doc.mode === 'poster'
      ? buildPosterHtml(doc, dataUris)
      : buildSheetHtml(doc, dataUris);
  }, [collectTiles, doc]);

  const doPrint = useCallback(() => {
    void run('Opening print dialog…', async () => {
      const html = await buildHtml();
      await printHtml(html);
      setNotice({
        tone: 'success',
        message: 'Print dialog opened. Choose a printer or save as PDF.',
      });
    });
  }, [buildHtml, run, setNotice]);

  const doPdf = useCallback(() => {
    void run('Building PDF…', async () => {
      const html = await buildHtml();
      const uri = await htmlToPdf(html, outputFileName('poster', doc?.title ?? 'poster'));
      await sharePdf(uri, 'Share poster PDF');
    });
  }, [buildHtml, doc?.title, run]);

  const doSaveTiles = useCallback(() => {
    void run('Saving tiles to Photos…', async () => {
      const { uris } = await collectTiles(1800);
      for (const uri of uris) {
        await saveToGallery(uri);
      }
      setNotice({
        tone: 'success',
        message: `${uris.length} tile${uris.length === 1 ? '' : 's'} saved to your photos.`,
      });
    });
  }, [collectTiles, run, setNotice]);

  const sheetActions: SheetAction[] = [
    {
      key: 'print',
      label: 'Print',
      caption: doc?.mode === 'poster' ? `${tileCount} A4 pages, one per tile` : 'One contact sheet',
      icon: <PrinterIcon size={19} color={colors.mintDark} />,
      onPress: doPrint,
      disabled: !gridOk,
    },
    {
      key: 'pdf',
      label: 'Share PDF',
      caption: 'Save or send it to a print shop',
      icon: <DownloadIcon size={19} color={colors.mintDark} />,
      onPress: doPdf,
      disabled: !sharing || !gridOk,
    },
    {
      key: 'tiles',
      label: 'Save tiles to Photos',
      caption: isExpoGo()
        ? 'Limited in Expo Go — Share PDF instead'
        : 'One image per tile, ready to print',
      icon: <PhotoIcon size={19} color={colors.mintDark} />,
      onPress: doSaveTiles,
      disabled: !gridOk,
    },
  ];

  if (!doc || !photo) {
    return (
      <ToolScaffold title="Grid cut & poster" subtitle="Slice · print · paste" onBack={onClose}>
        <EmptyState
          title="Cut one picture into tiles"
          body="Pick a photo, choose a grid and every tile prints on its own page — then tape them together to make a poster."
          actionLabel="CHOOSE A PHOTO"
          onAction={pickOne}
          icon={<ScissorsIcon size={26} color={colors.mintDark} />}
        />
        <InlineNotice
          message="Tip: a 3 × 3 grid turns a phone photo into a 9-page A4 poster."
        />
        <BusyOverlay visible={busy !== null} message={busy ?? 'Working…'} />
      </ToolScaffold>
    );
  }

  return (
    <ToolScaffold
      title="Grid cut & poster"
      subtitle={`${photo.width} × ${photo.height} px`}
      onBack={onClose}
      right={
        <Pressable
          onPress={pickOne}
          accessibilityRole="button"
          accessibilityLabel="Change photo"
          hitSlop={8}
        >
          <Text style={styles.changeText}>Change</Text>
        </Pressable>
      }
      footer={
        <ToolButton
          label={`PRINT OR SHARE · ${tileCount} TILES`}
          onPress={() => setSheetOpen(true)}
          disabled={busy !== null || !gridOk || isWeb}
        />
      }
    >
      <View style={styles.previewWrap}>
        <View style={[styles.preview, { width: previewWidth, height: previewHeight }]}>
          <Image
            source={{ uri: photo.uri }}
            resizeMode="contain"
            style={StyleSheet.absoluteFill}
          />

          {previewFit.w > 1
            ? Array.from({ length: Math.max(0, doc.cols - 1) }, (_, index) => (
                <View
                  key={`v-${index}`}
                  style={[
                    styles.gridLineV,
                    {
                      left: previewFit.x + (previewFit.w * (index + 1)) / doc.cols,
                      top: previewFit.y,
                      height: previewFit.h,
                    },
                  ]}
                />
              ))
            : null}
          {previewFit.h > 1
            ? Array.from({ length: Math.max(0, doc.rows - 1) }, (_, index) => (
                <View
                  key={`h-${index}`}
                  style={[
                    styles.gridLineH,
                    {
                      top: previewFit.y + (previewFit.h * (index + 1)) / doc.rows,
                      left: previewFit.x,
                      width: previewFit.w,
                    },
                  ]}
                />
              ))
            : null}
        </View>
      </View>
      <Text style={styles.previewHint}>
        {doc.rows} × {doc.cols} · {tileCount} tiles · {getPaper(doc.paper).label}
      </Text>

      {!gridOk ? (
        <InlineNotice
          tone="error"
          message="This grid is too fine for this photo. Use fewer rows or columns."
        />
      ) : null}

      {notice ? (
        <InlineNotice
          tone={notice.tone}
          message={notice.message}
          actionLabel={notice.actionLabel}
          onAction={notice.onAction}
        />
      ) : null}

      {isWeb ? (
        <InlineNotice message="Printing and sharing run in the Expo Go app on your phone." />
      ) : null}

      <SectionLabel>1 · GRID</SectionLabel>
      <View style={styles.panel}>
        <View style={styles.chipRow}>
          {SLICE_PRESETS.map((preset) => (
            <OptionChip
              key={preset.label}
              label={preset.label}
              active={doc.rows === preset.rows && doc.cols === preset.cols}
              onPress={() => patch({ rows: preset.rows, cols: preset.cols })}
            />
          ))}
        </View>
        <View style={styles.divider} />
        <Stepper
          label="Rows"
          value={doc.rows}
          min={1}
          max={6}
          onChange={(rows) => patch({ rows })}
        />
        <Stepper
          label="Columns"
          value={doc.cols}
          min={1}
          max={6}
          onChange={(cols) => patch({ cols })}
        />
      </View>

      <SectionLabel>2 · OUTPUT</SectionLabel>
      <View style={styles.panel}>
        <View style={styles.chipRow}>
          <OptionChip
            label="Poster pages"
            active={doc.mode === 'poster'}
            onPress={() => patch({ mode: 'poster' })}
          />
          <OptionChip
            label="Contact sheet"
            active={doc.mode === 'sheet'}
            onPress={() => patch({ mode: 'sheet' })}
          />
        </View>

        <Text style={styles.subLabel}>PAPER</Text>
        <View style={styles.chipRow}>
          {PAPER_OPTIONS.map((option) => (
            <OptionChip
              key={option.id}
              label={option.label}
              active={doc.paper === option.id}
              onPress={() => patch({ paper: option.id })}
            />
          ))}
        </View>

        <View style={styles.divider} />
        <Stepper
          label="Margin"
          value={doc.marginMm}
          min={5}
          max={25}
          suffix="mm"
          onChange={(marginMm) => patch({ marginMm })}
        />
        {doc.mode === 'poster' ? (
          <Stepper
            label="Overlap for pasting"
            value={doc.overlapMm}
            min={0}
            max={10}
            suffix="mm"
            onChange={(overlapMm) => patch({ overlapMm })}
          />
        ) : (
          <Stepper
            label="Gutter"
            value={doc.gutterMm}
            min={1}
            max={10}
            suffix="mm"
            onChange={(gutterMm) => patch({ gutterMm })}
          />
        )}
        <ToggleRow
          label="Tile labels"
          caption="Shows R1C1 style labels for assembly"
          value={doc.showLabels}
          onChange={(showLabels) => patch({ showLabels })}
        />
      </View>

      <SectionLabel>3 · FINISH</SectionLabel>
      <View style={styles.panel}>
        <TextField
          label="Print name"
          value={doc.title}
          onChangeText={(title) => patch({ title })}
          placeholder="Poster print"
        />
        <View style={styles.divider} />
        <ToggleRow
          label="Cut guides"
          caption="Dashed lines to trim each tile"
          value={doc.showCutMarks}
          onChange={(showCutMarks) => patch({ showCutMarks })}
        />
        <ToggleRow
          label="Scale ruler"
          caption="10 cm check on the printed page"
          value={doc.showRuler}
          onChange={(showRuler) => patch({ showRuler })}
        />
      </View>

      <View style={styles.tipWrap}>
        <Text style={styles.tipText}>
          {doc.mode === 'poster'
            ? `Tip: print all ${tileCount} pages at “Actual size”, trim the white edges and tape the tiles in row order.`
            : 'Tip: the contact sheet is handy for checking the grid before you print the full poster.'}
        </Text>
      </View>

      <ActionSheet
        visible={sheetOpen}
        title="Print the cut"
        message={`${tileCount} tiles · ${getPaper(doc.paper).label}`}
        actions={sheetActions}
        onClose={() => setSheetOpen(false)}
      />

      <BusyOverlay
        visible={busy !== null}
        message={busy ?? 'Working…'}
        hint="Large posters can take a few seconds to prepare."
      />
    </ToolScaffold>
  );
}

const styles = StyleSheet.create({
  changeText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.mintDark,
  },
  previewWrap: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  preview: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#0B1410',
  },
  gridLineV: {
    position: 'absolute',
    width: 1.5,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  gridLineH: {
    position: 'absolute',
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.9)',
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
    marginTop: 14,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 10,
  },
  tipWrap: {
    marginTop: 14,
  },
  tipText: {
    fontFamily: fonts.regular,
    fontSize: 10,
    lineHeight: 15,
    color: colors.muted,
  },
});
