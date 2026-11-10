import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SliderRow, ToolButton } from '../../../components/tool-kit';
import {
  clamp,
  coverBaseCrop,
  cropAtZoom,
  cropCenter,
  MAX_ZOOM,
  panCrop,
} from '../../../lib/media/crop-math';
import type { Crop, Photo } from '../../../lib/media/types';
import { colors, fonts, radius, shadow } from '../../../theme';
import { aspectAdjustedCrop } from '../model';
import { FittedPhoto } from './CollagePreview';

type Props = {
  visible: boolean;
  photo: Photo | null;
  /** Box aspect (w/h) the crop has to fill. */
  aspect: number;
  crop: Crop;
  title?: string;
  idGuide?: boolean;
  onCancel: () => void;
  onSave: (next: Crop) => void;
};

function zoomForCrop(photo: Photo, aspectValue: number, value: Crop): number {
  const base = coverBaseCrop(photo.width, photo.height, aspectValue);
  return clamp(base.w / Math.max(value.w, 0.0001), 1, MAX_ZOOM);
}

/** Drag + zoom crop editor shared by collage cells and ID photos. */
export function AdjustCropModal({
  visible,
  photo,
  aspect,
  crop,
  title = 'Adjust photo',
  idGuide = false,
  onCancel,
  onSave,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [draft, setDraft] = useState<Crop>(crop);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!visible || !photo) return;
    const initial = aspectAdjustedCrop(photo, crop, aspect);
    setDraft(initial);
    setZoom(zoomForCrop(photo, aspect, initial));
    // Only re-seed when the modal opens or the target photo/aspect changes.
  }, [visible, photo, aspect]);

  const maxWidth = Math.min(windowWidth - 88, 330);
  const boxW = Math.min(maxWidth, 340 * aspect);
  const boxH = boxW / Math.max(aspect, 0.01);

  const draftRef = useRef(draft);
  draftRef.current = draft;
  const boxRef = useRef({ w: boxW, h: boxH });
  boxRef.current = { w: boxW, h: boxH };
  const startCropRef = useRef<Crop | null>(null);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startCropRef.current = draftRef.current;
        },
        onPanResponderMove: (_event, gesture) => {
          const start = startCropRef.current;
          if (!start) return;
          const box = boxRef.current;
          setDraft(panCrop(start, gesture.dx, gesture.dy, box.w, box.h));
        },
      }),
    [],
  );

  const handleZoom = (nextZoom: number) => {
    if (!photo) return;
    setZoom(nextZoom);
    setDraft((previous) =>
      cropAtZoom(photo.width, photo.height, aspect, nextZoom, cropCenter(previous)),
    );
  };

  const reset = () => {
    if (!photo) return;
    setZoom(1);
    setDraft(cropAtZoom(photo.width, photo.height, aspect, 1, { x: 0.5, y: 0.5 }));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { marginBottom: insets.bottom }]}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>Drag to move · slide to zoom</Text>

          <View style={[styles.preview, { width: boxW, height: boxH }]} {...panResponder.panHandlers}>
            {photo ? (
              <FittedPhoto photo={photo} crop={draft} boxW={boxW} boxH={boxH} />
            ) : null}

            {idGuide ? (
              <>
                <View pointerEvents="none" style={[styles.guide, { top: boxH * 0.32 }]} />
                <View pointerEvents="none" style={[styles.guide, { top: boxH * 0.82 }]} />
                <View pointerEvents="none" style={[styles.guideLabel, { top: boxH * 0.32 - 14 }]}>
                  <Text style={styles.guideText}>EYES</Text>
                </View>
                <View pointerEvents="none" style={[styles.guideLabel, { top: boxH * 0.82 - 14 }]}>
                  <Text style={styles.guideText}>CHIN</Text>
                </View>
              </>
            ) : null}

            <View pointerEvents="none" style={styles.thirds}>
              <View style={styles.thirdLine} />
              <View style={styles.thirdLineMiddle} />
            </View>
          </View>

          <View style={styles.sliderWrap}>
            <SliderRow
              label="Zoom"
              value={zoom}
              min={1}
              max={MAX_ZOOM}
              step={0.1}
              formatValue={(value) => `${value.toFixed(1)}×`}
              onChange={handleZoom}
            />
          </View>

          <View style={styles.actions}>
            <ToolButton
              label="RESET"
              tone="outline"
              onPress={reset}
              style={styles.actionButton}
            />
            <ToolButton
              label="DONE"
              onPress={() => onSave(draft)}
              style={styles.actionButton}
            />
          </View>

          <ToolButton label="Cancel" tone="light" onPress={onCancel} style={styles.cancel} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(14,26,21,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: 18,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    ...shadow.float,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    color: colors.muted,
    marginTop: 3,
    marginBottom: 14,
  },
  preview: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#0B1410',
  },
  guide: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(143,232,201,0.9)',
  },
  guideLabel: {
    position: 'absolute',
    right: 10,
  },
  guideText: {
    fontFamily: fonts.semibold,
    fontSize: 7,
    letterSpacing: 1,
    color: 'rgba(143,232,201,0.95)',
  },
  thirds: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  thirdLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '33.33%',
    height: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  thirdLineMiddle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '33.33%',
    width: 0,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  sliderWrap: {
    width: '100%',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    width: '100%',
  },
  actionButton: {
    flex: 1,
  },
  cancel: {
    marginTop: 8,
    width: '100%',
  },
});
