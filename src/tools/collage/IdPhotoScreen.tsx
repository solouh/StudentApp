import { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import { cropToPx } from '../../lib/media/crop-math';
import { cropPhoto, pickPhotos, saveToGallery, toBase64 } from '../../lib/media/image';
import type { Photo } from '../../lib/media/types';
import { jpegDataUri } from '../../lib/print/dataUri';
import { htmlToPdf, printHtml } from '../../lib/print/print';
import { isSharingAvailable, sharePdf } from '../../lib/share';
import { useToolSettings } from '../../lib/settings';
import { useBackHandler } from '../../lib/useBackHandler';
import { isExpoGo } from '../../lib/env';
import { ToolError } from '../../lib/errors';
import { colors, fonts, radius } from '../../theme';
import { useToolTasks } from '../useToolTasks';
import { buildIdSheetHtml } from './html';
import { AdjustCropModal } from './components/AdjustCropModal';
import { IdSheetPreview } from './components/IdSheetPreview';
import {
  aspectAdjustedCrop,
  createIdDoc,
  idSheetCapacity,
  ID_SIZES,
  outputFileName,
  type IdDoc,
  type IdSheetPaper,
  type IdSize,
} from './model';

const SHEET_OPTIONS: { id: IdSheetPaper; label: string }[] = [
  { id: '4R', label: '4R photo paper' },
  { id: 'A4', label: 'A4 sheet' },
];

export default function IdPhotoScreen({ onClose }: { onClose: () => void }) {
  const { width: windowWidth } = useWindowDimensions();
  const settings = useToolSettings();
  const { run, busy, notice, setNotice } = useToolTasks();

  const [photo, setPhoto] = useState<Photo | null>(null);
  const [doc, setDoc] = useState<IdDoc | null>(null);
  const [sharing, setSharing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
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
        createIdDoc(next, {
          paper: settings.value.paper,
          showCutMarks: settings.value.showCutMarks,
          showRuler: settings.value.showRuler,
        }),
      );
    });
  }, [run, settings.value]);

  const capacity = useMemo(
    () => (doc ? idSheetCapacity(doc.size, doc.paper, doc.gutterMm) : 0),
    [doc],
  );

  const patch = useCallback((changes: Partial<IdDoc>) => {
    setDoc((previous) => (previous ? { ...previous, ...changes } : previous));
  }, []);

  const changeSize = useCallback(
    (size: IdSize) => {
      setDoc((previous) =>
        previous
          ? {
              ...previous,
              size,
              crop: aspectAdjustedCrop(previous.photo, previous.crop, size.wMm / size.hMm),
            }
          : previous,
      );
    },
    [],
  );

  const collect = useCallback(async (): Promise<{ uri: string; dataUri: string }> => {
    if (!doc) throw new ToolError('image', 'Choose a photo first.');
    const aspect = doc.size.wMm / doc.size.hMm;
    const crop = aspectAdjustedCrop(doc.photo, doc.crop, aspect);
    const px = cropToPx(crop, doc.photo.width, doc.photo.height);
    const uri = await cropPhoto(doc.photo, px, 1800);
    const dataUri = jpegDataUri(await toBase64(uri));
    return { uri, dataUri };
  }, [doc]);

  const buildHtml = useCallback(async (): Promise<string> => {
    if (!doc) throw new ToolError('image', 'Choose a photo first.');
    const { dataUri } = await collect();
    return buildIdSheetHtml(doc, dataUri);
  }, [collect, doc]);

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
      const uri = await htmlToPdf(html, outputFileName('id-photo', doc?.title ?? 'id-photo'));
      await sharePdf(uri, 'Share ID photo sheet');
    });
  }, [buildHtml, doc?.title, run]);

  const doSavePhoto = useCallback(() => {
    void run('Saving photo…', async () => {
      const { uri } = await collect();
      await saveToGallery(uri);
      setNotice({ tone: 'success', message: 'Photo saved to your gallery.' });
    });
  }, [collect, run, setNotice]);

  const copiesLabel = doc
    ? doc.copies === 'auto'
      ? `${capacity} copies (fills the sheet)`
      : `${Math.min(doc.copies, capacity)} copies`
    : '';

  const sheetActions: SheetAction[] = [
    {
      key: 'print',
      label: 'Print',
      caption: doc ? `${copiesLabel} on ${doc.paper}` : undefined,
      icon: <PrinterIcon size={19} color={colors.mintDark} />,
      onPress: doPrint,
    },
    {
      key: 'pdf',
      label: 'Share PDF',
      caption: 'Save or send to a photo shop',
      icon: <DownloadIcon size={19} color={colors.mintDark} />,
      onPress: doPdf,
      disabled: !sharing,
    },
    {
      key: 'photo',
      label: 'Save photo to Photos',
      caption: isExpoGo()
        ? 'Limited in Expo Go — Share PDF instead'
        : 'Just the cropped photo',
      icon: <PhotoIcon size={19} color={colors.mintDark} />,
      onPress: doSavePhoto,
    },
  ];

  if (!doc || !photo) {
    return (
      <ToolScaffold title="ID photo sheet" subtitle="Passport / IC · print" onBack={onClose}>
        <EmptyState
          title="Make a photo sheet"
          body="Crop one photo to a standard ID size, then print a sheet of copies on 4R or A4."
          actionLabel="CHOOSE A PHOTO"
          onAction={pickOne}
          icon={<PhotoIcon size={26} color={colors.mintDark} />}
        />
        <InlineNotice message="Use a plain background and face the light for the best print." />
        <BusyOverlay visible={busy !== null} message={busy ?? 'Working…'} />
      </ToolScaffold>
    );
  }

  const previewWidth = Math.min(windowWidth - 56, 280);

  return (
    <ToolScaffold
      title="ID photo sheet"
      subtitle={`${doc.size.wMm} × ${doc.size.hMm} mm each`}
      onBack={onClose}
      right={
        <Pressable onPress={pickOne} accessibilityRole="button" accessibilityLabel="Change photo" hitSlop={8}>
          <Text style={styles.changeText}>Change</Text>
        </Pressable>
      }
      footer={
        <ToolButton
          label={`PRINT OR SHARE · ${copiesLabel}`}
          onPress={() => setSheetOpen(true)}
          disabled={busy !== null || isWeb}
        />
      }
    >
      <View style={styles.previewWrap}>
        <IdSheetPreview doc={doc} width={previewWidth} />
      </View>
      <Text style={styles.previewHint}>{copiesLabel} · tap “Adjust photo” to zoom</Text>

      <View style={styles.quickRow}>
        <ToolButton
          label="ADJUST PHOTO"
          tone="mint"
          onPress={() => setAdjustOpen(true)}
          style={styles.quickButton}
        />
      </View>

      {notice ? (
        <InlineNotice
          tone={notice.tone}
          message={notice.message}
          actionLabel={notice.actionLabel}
          onAction={notice.onAction}
        />
      ) : null}

      {isWeb ? (
        <InlineNotice message="Printing and saving run in the Expo Go app on your phone." />
      ) : null}

      <SectionLabel>1 · PHOTO SIZE</SectionLabel>
      <View style={styles.panel}>
        <View style={styles.chipRow}>
          {ID_SIZES.map((size) => (
            <OptionChip
              key={size.id}
              label={size.label}
              active={doc.size.id === size.id}
              onPress={() => changeSize(size)}
            />
          ))}
        </View>
        <Text style={styles.hint}>
          Common print sizes — check your school or passport office requirements.
        </Text>
      </View>

      <SectionLabel>2 · SHEET</SectionLabel>
      <View style={styles.panel}>
        <View style={styles.chipRow}>
          {SHEET_OPTIONS.map((option) => (
            <OptionChip
              key={option.id}
              label={option.label}
              active={doc.paper === option.id}
              onPress={() => patch({ paper: option.id })}
            />
          ))}
        </View>
        <View style={styles.divider} />
        <ToggleRow
          label="Fill the sheet"
          caption={`Up to ${capacity} copies fit`}
          value={doc.copies === 'auto'}
          onChange={(auto) =>
            patch({ copies: auto ? 'auto' : Math.min(capacity, 4) })
          }
        />
        {doc.copies !== 'auto' ? (
          <Stepper
            label="Copies"
            value={Math.min(doc.copies, capacity)}
            min={1}
            max={Math.max(1, capacity)}
            onChange={(copies) => patch({ copies })}
          />
        ) : null}
        <Stepper
          label="Gap between photos"
          value={doc.gutterMm}
          min={0}
          max={10}
          suffix="mm"
          onChange={(gutterMm) => patch({ gutterMm })}
        />
      </View>

      <SectionLabel>3 · FINISH</SectionLabel>
      <View style={styles.panel}>
        <TextField
          label="Print name"
          value={doc.title}
          onChangeText={(title) => patch({ title })}
          placeholder="ID photo sheet"
        />
        <View style={styles.divider} />
        <ToggleRow
          label="Cut guides"
          caption="Dashed lines around each copy"
          value={doc.showCutMarks}
          onChange={(showCutMarks) => patch({ showCutMarks })}
        />
        <ToggleRow
          label="Scale ruler"
          caption="A4 only · 10 cm check"
          value={doc.showRuler}
          onChange={(showRuler) => patch({ showRuler })}
        />
      </View>

      <View style={styles.tipWrap}>
        <Text style={styles.tipText}>
          Tip: print at “Actual size” for exact millimetres, then cut along the
          guides. Ask the shop for glossy photo paper for the best result.
        </Text>
      </View>

      <ActionSheet
        visible={sheetOpen}
        title="Print the photo sheet"
        message={copiesLabel}
        actions={sheetActions}
        onClose={() => setSheetOpen(false)}
      />

      <BusyOverlay
        visible={busy !== null}
        message={busy ?? 'Working…'}
        hint="Photos are processed on this phone."
      />

      <AdjustCropModal
        visible={adjustOpen}
        photo={photo}
        aspect={doc.size.wMm / doc.size.hMm}
        crop={doc.crop}
        title="Adjust ID photo"
        idGuide
        onCancel={() => setAdjustOpen(false)}
        onSave={(crop) => {
          patch({ crop });
          setAdjustOpen(false);
        }}
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
    paddingVertical: 8,
  },
  previewHint: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  quickRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  quickButton: {
    flex: 1,
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
  hint: {
    fontFamily: fonts.regular,
    fontSize: 10,
    lineHeight: 15,
    color: colors.muted,
    marginTop: 10,
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
