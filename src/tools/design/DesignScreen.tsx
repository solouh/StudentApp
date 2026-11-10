/**
 * Design Studio: an offline, Canva-style page editor.
 *
 * Templates on the left of the workflow, a live canvas in the middle, and an
 * inspector for the selected layer. Everything is stored in the same
 * millimetre model used for print, so what you see is what prints.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type HostInstance,
} from 'react-native';
import { File, Paths } from 'expo-file-system';
import {
  CheckIcon,
  DownloadIcon,
  LayersIcon,
  PhotoIcon,
  PrinterIcon,
  TrashIcon,
} from '../../components/Icons';
import {
  ActionSheet,
  BusyOverlay,
  InlineNotice,
  OptionChip,
  SectionLabel,
  SliderRow,
  Stepper,
  ToolButton,
  ToolScaffold,
  type SheetAction,
} from '../../components/tool-kit';
import { capturePng, pickPhotos, saveToGallery, toBase64 } from '../../lib/media/image';
import { htmlToPdf, printHtml } from '../../lib/print/print';
import { isSharingAvailable, sharePdf } from '../../lib/share';
import { loadJSON, saveJSON, STORAGE_PREFIX } from '../../lib/storage';
import { useBackHandler } from '../../lib/useBackHandler';
import { colors, fonts, radius, shadow } from '../../theme';
import { useToolTasks } from '../useToolTasks';
import { DesignCanvas } from './components/DesignCanvas';
import { buildDesignHtml, designFileName } from './html';
import {
  addLayer,
  bringToFront,
  createEmojiLayer,
  createImageLayer,
  createShapeLayer,
  createTextLayer,
  describeDesign,
  duplicateLayer,
  EMOJI_CHOICES,
  getPage,
  PAGE_ORDER,
  PAGES,
  removeLayer,
  reorderLayer,
  sendToBack,
  setPage,
  SWATCHES,
  updateLayer,
  type Design,
  type Layer,
  type LayerPatch,
  type PageKind,
  type ShapeKind,
  type TextAlign,
} from './model';
import { buildTemplate, TEMPLATES } from './templates';

const DRAFT_KEY = `${STORAGE_PREFIX}designDraft`;
/** PNG export width in pixels. */
const EXPORT_WIDTH = 1600;

type Sheet = 'export' | 'templates' | null;

/** Image layers are inlined as base64 for print/PDF, like the print studio. */
async function collectImages(design: Design): Promise<Record<string, string>> {
  const images: Record<string, string> = {};
  for (const layer of design.layers) {
    if (layer.type !== 'image') continue;
    const base64 = await toBase64(layer.uri);
    const ext = /\.png$/i.test(layer.uri) ? 'png' : 'jpeg';
    images[layer.id] = `data:image/${ext};base64,${base64}`;
  }
  return images;
}

/**
 * Copies a picked photo out of the cache into app storage. Picker results live
 * in the cache directory, which the OS may reclaim — a saved design with a
 * vanishing photo would lose it. Falls back to the cache uri on failure.
 */
function persistPhoto(uri: string): string {
  try {
    const source = new File(uri);
    const target = new File(
      Paths.document,
      `design-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}.jpg`,
    );
    source.copy(target);
    return target.uri;
  } catch {
    return uri;
  }
}

/* ------------------------------------------------------------------ */
/* Small controls                                                      */
/* ------------------------------------------------------------------ */

function AddButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Add ${label}`}
      style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
    >
      <Text style={styles.addButtonText}>{label}</Text>
    </Pressable>
  );
}

function SwatchRow({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <View style={styles.swatchRow}>
      {SWATCHES.map((color) => {
        const active = color.toLowerCase() === value.toLowerCase();
        return (
          <Pressable
            key={color}
            onPress={() => onChange(color)}
            accessibilityRole="button"
            accessibilityLabel={`Colour ${color}`}
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.swatch,
              { backgroundColor: color },
              active && styles.swatchActive,
              pressed && styles.pressed,
            ]}
          >
            {active ? (
              <CheckIcon
                size={11}
                color={color === '#FFFFFF' || color === '#E6F8F1' ? colors.ink : colors.white}
                strokeWidth={3}
              />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function ChipRow<T extends string | number>({
  options,
  value,
  onChange,
  format,
}: {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  format?: (option: T) => string;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((option) => (
        <OptionChip
          key={String(option)}
          label={format ? format(option) : String(option)}
          active={option === value}
          onPress={() => onChange(option)}
        />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function DesignScreen({ onClose }: { onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const { run, busy, notice, setNotice } = useToolTasks();

  const [design, setDesign] = useState<Design>(() => buildTemplate('assignment-cover'));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [sharing, setSharing] = useState(false);

  const canvasRef = useRef<HostInstance | null>(null);
  const designRef = useRef(design);
  designRef.current = design;
  const selectedRef = useRef<string | null>(selectedId);
  selectedRef.current = selectedId;

  useBackHandler(
    useCallback(() => {
      onClose();
      return true;
    }, [onClose]),
  );

  // Restore the draft once, then autosave (debounced) on every change.
  useEffect(() => {
    let mounted = true;
    loadJSON<Design | null>(DRAFT_KEY, null)
      .then((saved) => {
        if (!mounted) return;
        if (saved && typeof saved === 'object' && Array.isArray(saved.layers)) {
          setDesign(saved);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return undefined;
    const timer = setTimeout(() => {
      void saveJSON(DRAFT_KEY, design);
    }, 400);
    return () => clearTimeout(timer);
  }, [design, loaded]);

  useEffect(() => {
    void isSharingAvailable().then(setSharing);
  }, []);

  /* ---------------------------------------------------------------- */
  /* Geometry                                                          */
  /* ---------------------------------------------------------------- */

  const page = getPage(design.page);
  const maxWidth = Math.min(420, width - 40);
  const maxHeight = Math.max(200, height * 0.4);
  const scale = Math.min(maxWidth / page.wMm, maxHeight / page.hMm);
  const canvasWidth = Math.max(120, page.wMm * scale);
  const aspect = page.wMm / page.hMm;

  const selected = design.layers.find((layer) => layer.id === selectedId) ?? null;

  /* ---------------------------------------------------------------- */
  /* Editing                                                           */
  /* ---------------------------------------------------------------- */

  const patch = useCallback((changes: LayerPatch) => {
    const id = selectedRef.current;
    if (!id) return;
    setDesign((previous) => updateLayer(previous, id, changes));
  }, []);

  const insert = useCallback((layer: Layer) => {
    setDesign((previous) => addLayer(previous, layer));
    setSelectedId(layer.id);
  }, []);

  const addText = useCallback(() => {
    const current = designRef.current;
    const spec = getPage(current.page);
    const w = Math.min(spec.wMm * 0.62, 130);
    insert(createTextLayer('New text', (spec.wMm - w) / 2, spec.hMm * 0.38, w));
  }, [insert]);

  const addShape = useCallback(
    (shape: ShapeKind) => {
      const current = designRef.current;
      const spec = getPage(current.page);
      if (shape === 'line') {
        const w = spec.wMm * 0.6;
        const layer = createShapeLayer('line', (spec.wMm - w) / 2, spec.hMm * 0.5, w, 0.8, colors.ink);
        insert({ ...layer, strokeWidth: 0.8 });
        return;
      }
      const size = Math.min(spec.wMm, spec.hMm) * 0.3;
      insert(
        createShapeLayer(
          shape,
          (spec.wMm - size) / 2,
          (spec.hMm - size) / 2,
          size,
          size,
          colors.mintSoft,
        ),
      );
    },
    [insert],
  );

  const addEmoji = useCallback(
    (emoji: string) => {
      const current = designRef.current;
      const spec = getPage(current.page);
      const size = Math.min(spec.wMm, spec.hMm) * 0.14;
      insert(createEmojiLayer(emoji, (spec.wMm - size) / 2, (spec.hMm - size) / 2, size));
      setEmojiOpen(false);
    },
    [insert],
  );

  const addPhoto = useCallback(() => {
    void run('Loading photo…', async () => {
      const photos = await pickPhotos(1);
      if (!photos.length) return;
      const photo = photos[0];
      const spec = getPage(designRef.current.page);
      const photoAspect = photo.height > 0 ? photo.width / photo.height : 1;
      let w = spec.wMm * 0.55;
      let h = w / Math.max(photoAspect, 0.1);
      if (h > spec.hMm * 0.6) {
        h = spec.hMm * 0.6;
        w = h * photoAspect;
      }
      insert(
        createImageLayer(persistPhoto(photo.uri), (spec.wMm - w) / 2, (spec.hMm - h) / 2, w, h),
      );
    });
  }, [insert, run]);

  const removeSelected = useCallback(() => {
    const id = selectedRef.current;
    if (!id) return;
    setDesign((previous) => removeLayer(previous, id));
    setSelectedId(null);
  }, []);

  const duplicateSelected = useCallback(() => {
    const id = selectedRef.current;
    if (!id) return;
    const result = duplicateLayer(designRef.current, id);
    if (!result.layerId) return;
    setDesign(result.design);
    setSelectedId(result.layerId);
  }, []);

  const applyTemplate = useCallback((id: string) => {
    setDesign(buildTemplate(id));
    setSelectedId(null);
    setSheet(null);
  }, []);

  /* ---------------------------------------------------------------- */
  /* Export                                                            */
  /* ---------------------------------------------------------------- */

  const savePng = useCallback(() => {
    void run('Rendering image…', async () => {
      const uri = await capturePng(canvasRef, EXPORT_WIDTH, aspect);
      await saveToGallery(uri);
      setNotice({ tone: 'success', message: 'Saved to Photos.' });
    });
  }, [aspect, run, setNotice]);

  const doPrint = useCallback(() => {
    void run('Preparing print…', async () => {
      const images = await collectImages(designRef.current);
      await printHtml(buildDesignHtml(designRef.current, images));
    });
  }, [run]);

  const sharePdfDesign = useCallback(() => {
    void run('Building PDF…', async () => {
      const images = await collectImages(designRef.current);
      const uri = await htmlToPdf(
        buildDesignHtml(designRef.current, images),
        designFileName(designRef.current),
      );
      await sharePdf(uri, 'Share design PDF');
    });
  }, [run]);

  const exportActions: SheetAction[] = [
    {
      key: 'png-save',
      label: 'Save PNG to Photos',
      caption: `${EXPORT_WIDTH} px wide image`,
      icon: <PhotoIcon size={19} color={colors.mintDark} />,
      onPress: savePng,
    },
    {
      key: 'print',
      label: 'Print',
      caption: 'System print dialog, or Save as PDF',
      icon: <PrinterIcon size={19} color={colors.mintDark} />,
      onPress: doPrint,
    },
    {
      key: 'pdf',
      label: 'Share PDF',
      caption: sharing ? 'Send to WhatsApp, Drive or email' : 'Sharing is not available here',
      icon: <DownloadIcon size={19} color={colors.mintDark} />,
      disabled: !sharing,
      onPress: sharePdfDesign,
    },
  ];

  const templateActions: SheetAction[] = TEMPLATES.map((template) => ({
    key: template.id,
    label: template.name,
    caption: template.subtitle,
    icon: <LayersIcon size={19} color={colors.mintDark} />,
    onPress: () => applyTemplate(template.id),
  }));

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <>
      <ToolScaffold
        title="Design Studio"
        subtitle={describeDesign(design)}
        onBack={onClose}
        right={
          <Pressable
            onPress={() => setSheet('templates')}
            accessibilityRole="button"
            accessibilityLabel="Choose a template"
            style={({ pressed }) => [styles.headerPill, pressed && styles.pressed]}
          >
            <Text style={styles.headerPillText}>Templates</Text>
          </Pressable>
        }
        footer={
          <View style={styles.footerRow}>
            <ToolButton
              label="Templates"
              tone="outline"
              onPress={() => setSheet('templates')}
              style={styles.footerButton}
            />
            <ToolButton
              label="Export"
              tone="dark"
              onPress={() => setSheet('export')}
              style={styles.footerButton}
            />
          </View>
        }
      >
        <View style={styles.canvasWrap}>
          <View style={[styles.paper, { width: canvasWidth, shadowColor: colors.ink }]}>
            <DesignCanvas
              design={design}
              widthPx={canvasWidth}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onChange={setDesign}
              canvasRef={canvasRef}
            />
          </View>
          <Text style={styles.canvasHint}>
            Tap to select · drag to move · corner dot to resize
          </Text>
        </View>

        <SectionLabel>ADD</SectionLabel>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.addRow}
        >
          <AddButton label="Text" onPress={addText} />
          <AddButton label="Box" onPress={() => addShape('rect')} />
          <AddButton label="Circle" onPress={() => addShape('ellipse')} />
          <AddButton label="Line" onPress={() => addShape('line')} />
          <AddButton label="Photo" onPress={addPhoto} />
          <AddButton
            label={emojiOpen ? 'Close stickers' : 'Sticker'}
            onPress={() => setEmojiOpen((previous) => !previous)}
          />
        </ScrollView>

        {emojiOpen ? (
          <View style={styles.emojiRow}>
            {EMOJI_CHOICES.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => addEmoji(emoji)}
                accessibilityRole="button"
                accessibilityLabel={`Add ${emoji} sticker`}
                style={({ pressed }) => [styles.emojiButton, pressed && styles.pressed]}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {selected ? (
          <View style={styles.inspector}>
            <SectionLabel>SELECTED LAYER</SectionLabel>

            <View style={styles.inspectorHeader}>
              <Text style={styles.layerName} numberOfLines={1}>
                {selected.name}
              </Text>
              <View style={styles.layerActions}>
                <Pressable
                  onPress={() => duplicateSelected()}
                  accessibilityRole="button"
                  accessibilityLabel="Duplicate layer"
                  style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                >
                  <LayersIcon size={15} color={colors.inkSoft} />
                </Pressable>
                <Pressable
                  onPress={() => setDesign((previous) => bringToFront(previous, selected.id))}
                  accessibilityRole="button"
                  accessibilityLabel="Bring to front"
                  style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                >
                  <Text style={styles.iconText}>↑</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    setDesign((previous) => reorderLayer(previous, selected.id, -1))
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Send backwards"
                  style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                >
                  <Text style={styles.iconText}>↓</Text>
                </Pressable>
                <Pressable
                  onPress={() => setDesign((previous) => sendToBack(previous, selected.id))}
                  accessibilityRole="button"
                  accessibilityLabel="Send to back"
                  style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                >
                  <Text style={styles.iconText}>⇩</Text>
                </Pressable>
                <Pressable
                  onPress={removeSelected}
                  accessibilityRole="button"
                  accessibilityLabel="Delete layer"
                  style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                >
                  <TrashIcon size={15} color={colors.danger} />
                </Pressable>
              </View>
            </View>

            {selected.type === 'text' ? (
              <>
                <TextInput
                  value={selected.text}
                  onChangeText={(text) => patch({ text })}
                  multiline
                  placeholder="Type something"
                  placeholderTextColor={colors.muted}
                  style={styles.textInput}
                  accessibilityLabel="Layer text"
                />
                <Stepper
                  label="Font size"
                  value={selected.fontSize}
                  min={2}
                  max={40}
                  step={0.5}
                  suffix=" mm"
                  onChange={(fontSize) => patch({ fontSize })}
                />
                <ChipRow
                  options={[400, 600, 800] as const}
                  value={selected.weight}
                  onChange={(weight) => patch({ weight })}
                  format={(option) => (option === 400 ? 'Regular' : option === 600 ? 'Bold' : 'Heavy')}
                />
                <ChipRow
                  options={['left', 'center', 'right'] as TextAlign[]}
                  value={selected.align}
                  onChange={(align) => patch({ align })}
                />
                <SectionLabel>COLOUR</SectionLabel>
                <SwatchRow value={selected.color} onChange={(color) => patch({ color })} />
              </>
            ) : null}

            {selected.type === 'shape' ? (
              <>
                <SectionLabel>FILL</SectionLabel>
                <SwatchRow value={selected.fill} onChange={(fill) => patch({ fill })} />
                {selected.shape === 'rect' ? (
                  <Stepper
                    label="Corner radius"
                    value={selected.radius}
                    min={0}
                    max={30}
                    suffix=" mm"
                    onChange={(nextRadius) => patch({ radius: nextRadius })}
                  />
                ) : null}
                <Stepper
                  label="Border"
                  value={selected.strokeWidth}
                  min={0}
                  max={4}
                  step={0.5}
                  suffix=" mm"
                  onChange={(strokeWidth) =>
                    patch({ strokeWidth, stroke: strokeWidth > 0 ? colors.ink : 'transparent' })
                  }
                />
              </>
            ) : null}

            {selected.type === 'emoji' ? (
              <>
                <SectionLabel>STICKER</SectionLabel>
                <View style={styles.emojiRow}>
                  {EMOJI_CHOICES.map((emoji) => (
                    <Pressable
                      key={emoji}
                      onPress={() => patch({ emoji })}
                      accessibilityRole="button"
                      accessibilityLabel={`Use ${emoji}`}
                      style={({ pressed }) => [
                        styles.emojiButton,
                        emoji === selected.emoji && styles.emojiButtonActive,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.emojiText}>{emoji}</Text>
                    </Pressable>
                  ))}
                </View>
                <Stepper
                  label="Size"
                  value={selected.size}
                  min={4}
                  max={80}
                  step={2}
                  suffix=" mm"
                  onChange={(size) => patch({ size, w: size, h: size })}
                />
              </>
            ) : null}

            {selected.type === 'image' ? (
              <>
                <SectionLabel>FIT</SectionLabel>
                <ChipRow
                  options={['cover', 'contain'] as const}
                  value={selected.fit}
                  onChange={(fit) => patch({ fit })}
                />
              </>
            ) : null}

            <SectionLabel>OPACITY</SectionLabel>
            <SliderRow
              label="Opacity"
              value={selected.opacity}
              min={0.1}
              max={1}
              step={0.05}
              formatValue={(option) => `${Math.round(option * 100)}%`}
              onChange={(opacity) => patch({ opacity })}
            />

            <View style={styles.rotateRow}>
              <Text style={styles.rotateLabel}>Rotate</Text>
              <Pressable
                onPress={() => patch({ rotation: selected.rotation - 15 })}
                accessibilityRole="button"
                accessibilityLabel="Rotate left"
                style={({ pressed }) => [styles.rotateButton, pressed && styles.pressed]}
              >
                <Text style={styles.iconText}>↺</Text>
              </Pressable>
              <Text style={styles.rotateValue}>{Math.round(selected.rotation)}°</Text>
              <Pressable
                onPress={() => patch({ rotation: selected.rotation + 15 })}
                accessibilityRole="button"
                accessibilityLabel="Rotate right"
                style={({ pressed }) => [styles.rotateButton, pressed && styles.pressed]}
              >
                <Text style={styles.iconText}>↻</Text>
              </Pressable>
              <Pressable
                onPress={() => patch({ rotation: 0 })}
                accessibilityRole="button"
                accessibilityLabel="Reset rotation"
                style={({ pressed }) => [styles.rotateReset, pressed && styles.pressed]}
              >
                <Text style={styles.rotateResetText}>Reset</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.emptyInspector}>
            <Text style={styles.emptyText}>
              Tap a layer on the page to edit it, or add something above.
            </Text>
          </View>
        )}

        <SectionLabel>PAGE</SectionLabel>
        <View style={styles.chipRow}>
          {PAGE_ORDER.map((kind: PageKind) => (
            <OptionChip
              key={kind}
              label={PAGES[kind].label}
              active={kind === design.page}
              onPress={() => setDesign((previous) => setPage(previous, kind))}
            />
          ))}
        </View>

        <SectionLabel>BACKGROUND</SectionLabel>
        <SwatchRow
          value={design.background}
          onChange={(background) => setDesign((previous) => ({ ...previous, background }))}
        />

        {notice ? (
          <InlineNotice
            tone={notice.tone}
            message={notice.message}
            actionLabel={notice.actionLabel}
            onAction={notice.onAction}
          />
        ) : null}

        <InlineNotice
          tone="info"
          message="Your design saves automatically on this phone. Export as PNG, or print it — nothing is uploaded."
        />

        <View style={styles.bottomGap} />
      </ToolScaffold>

      <ActionSheet
        visible={sheet === 'export'}
        title="Export design"
        message={`${describeDesign(design)} · saved at ${PAGES[design.page].label}`}
        actions={exportActions}
        onClose={() => setSheet(null)}
      />

      <ActionSheet
        visible={sheet === 'templates'}
        title="Start from a template"
        message="Templates replace the current page."
        actions={templateActions}
        onClose={() => setSheet(null)}
      />

      <BusyOverlay visible={busy !== null} message={busy ?? ''} />
    </>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.86,
  },
  headerPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.mintSoft,
  },
  headerPillText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.mintDark,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  footerButton: {
    flex: 1,
  },
  canvasWrap: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  paper: {
    backgroundColor: colors.white,
    borderRadius: 2,
    ...shadow.card,
  },
  canvasHint: {
    fontFamily: fonts.medium,
    fontSize: 9.5,
    color: colors.muted,
    marginTop: 10,
    textAlign: 'center',
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 4,
  },
  addButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#EEF2EF',
  },
  addButtonText: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: colors.inkSoft,
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  emojiButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiButtonActive: {
    borderColor: colors.mint,
    backgroundColor: colors.mintMist,
  },
  emojiText: {
    fontSize: 20,
  },
  inspector: {
    marginTop: 4,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    ...shadow.card,
  },
  inspectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  layerName: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.ink,
  },
  layerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.inkSoft,
    lineHeight: 17,
  },
  textInput: {
    marginTop: 10,
    minHeight: 44,
    maxHeight: 110,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: '#E6ECE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchActive: {
    borderColor: colors.ink,
    borderWidth: 2,
  },
  rotateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  rotateLabel: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.inkSoft,
  },
  rotateButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotateValue: {
    minWidth: 40,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.ink,
  },
  rotateReset: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rotateResetText: {
    fontFamily: fonts.semibold,
    fontSize: 10.5,
    color: colors.mintDark,
  },
  emptyInspector: {
    marginTop: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.body,
    textAlign: 'center',
  },
  bottomGap: {
    height: 8,
  },
});
