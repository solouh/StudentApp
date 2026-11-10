/**
 * The editable canvas: renders a design at screen scale and handles selection,
 * dragging and resizing.
 *
 * Interaction lives on ONE PanResponder on the canvas (not one per layer), so
 * overlapping layers resolve exactly like a real design tool: the topmost hit
 * wins, and an empty tap deselects. Handlers read refs rather than state so a
 * long drag never uses a stale design.
 */
import { useMemo, useRef, type RefObject } from 'react';
import {
  Image,
  PanResponder,
  StyleSheet,
  Text,
  View,
  type HostInstance,
} from 'react-native';
import { colors, fonts } from '../../../theme';
import {
  getPage,
  hitTest,
  updateLayer,
  type Design,
  type Layer,
} from '../model';

const HANDLE_SIZE = 22;

type Props = {
  design: Design;
  /** Canvas width in px; height follows the page aspect ratio. */
  widthPx: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (next: Design) => void;
  canvasRef: RefObject<HostInstance | null>;
};

function weightFont(weight: 400 | 600 | 800): string {
  if (weight === 400) return fonts.regular;
  if (weight === 800) return fonts.extra;
  return fonts.semibold;
}

/** One layer, positioned in screen pixels. */
function LayerItem({ layer, scale }: { layer: Layer; scale: number }) {
  const box = {
    position: 'absolute' as const,
    left: layer.x * scale,
    top: layer.y * scale,
    width: Math.max(1, layer.w * scale),
    height: Math.max(1, layer.h * scale),
    opacity: layer.opacity,
    transform: layer.rotation ? [{ rotate: `${layer.rotation}deg` }] : undefined,
  };

  if (layer.type === 'text') {
    return (
      <View style={[box, styles.clip]}>
        <Text
          style={{
            fontFamily: weightFont(layer.weight),
            fontSize: layer.fontSize * scale,
            lineHeight: layer.fontSize * scale * 1.18,
            color: layer.color,
            textAlign: layer.align,
          }}
          numberOfLines={0}
        >
          {layer.text || ' '}
        </Text>
      </View>
    );
  }

  if (layer.type === 'shape') {
    if (layer.shape === 'line') {
      return (
        <View
          style={[
            box,
            {
              height: Math.max(1, (layer.strokeWidth || 0.4) * scale),
              backgroundColor: layer.fill,
            },
          ]}
        />
      );
    }
    return (
      <View
        style={[
          box,
          {
            backgroundColor: layer.fill,
            borderRadius:
              layer.shape === 'ellipse' ? Math.max(layer.w, layer.h) * scale : layer.radius * scale,
            borderWidth: layer.strokeWidth > 0 ? Math.max(1, layer.strokeWidth * scale) : 0,
            borderColor: layer.stroke,
          },
        ]}
      />
    );
  }

  if (layer.type === 'emoji') {
    return (
      <View style={[box, styles.clip]}>
        <Text
          style={{
            fontSize: layer.size * scale,
            lineHeight: layer.h * scale,
            textAlign: 'center',
          }}
        >
          {layer.emoji}
        </Text>
      </View>
    );
  }

  return (
    <View style={[box, styles.clip]}>
      <Image
        source={{ uri: layer.uri }}
        style={StyleSheet.absoluteFill}
        resizeMode={layer.fit}
      />
    </View>
  );
}

export function DesignCanvas({
  design,
  widthPx,
  selectedId,
  onSelect,
  onChange,
  canvasRef,
}: Props) {
  const page = getPage(design.page);
  const scale = widthPx / page.wMm;
  const heightPx = widthPx * (page.hMm / page.wMm);

  // Refs mirror the latest props for the responders, which are created once.
  const designRef = useRef(design);
  designRef.current = design;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  /** Where the current drag started, in page mm. */
  const dragRef = useRef<{ id: string; x: number; y: number } | null>(null);
  /** Size at the start of the current resize, in page mm. */
  const resizeRef = useRef<{ id: string; w: number; h: number } | null>(null);

  const mover = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const currentScale = scaleRef.current;
          const pointX = event.nativeEvent.locationX / currentScale;
          const pointY = event.nativeEvent.locationY / currentScale;
          const hit = hitTest(designRef.current, pointX, pointY);
          if (!hit) {
            dragRef.current = null;
            onSelectRef.current(null);
            return;
          }
          onSelectRef.current(hit.id);
          dragRef.current = { id: hit.id, x: hit.x, y: hit.y };
        },
        onPanResponderMove: (_event, gesture) => {
          const drag = dragRef.current;
          if (!drag) return;
          const currentScale = scaleRef.current;
          onChangeRef.current(
            updateLayer(designRef.current, drag.id, {
              x: drag.x + gesture.dx / currentScale,
              y: drag.y + gesture.dy / currentScale,
            }),
          );
        },
        onPanResponderRelease: () => {
          dragRef.current = null;
        },
        onPanResponderTerminate: () => {
          dragRef.current = null;
        },
      }),
    [],
  );

  const resizer = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          const layer = designRef.current.layers.find(
            (candidate) => candidate.id === selectedRef.current,
          );
          resizeRef.current = layer ? { id: layer.id, w: layer.w, h: layer.h } : null;
        },
        onPanResponderMove: (_event, gesture) => {
          const resize = resizeRef.current;
          if (!resize) return;
          const currentScale = scaleRef.current;
          onChangeRef.current(
            updateLayer(designRef.current, resize.id, {
              w: resize.w + gesture.dx / currentScale,
              h: resize.h + gesture.dy / currentScale,
            }),
          );
        },
        onPanResponderRelease: () => {
          resizeRef.current = null;
        },
        onPanResponderTerminate: () => {
          resizeRef.current = null;
        },
      }),
    [],
  );

  const selected = design.layers.find((layer) => layer.id === selectedId) ?? null;

  return (
    // The wrapper does not clip, so the resize handle can sit on the corner
    // instead of being cut in half by the page's overflow: hidden.
    <View style={{ width: widthPx, height: heightPx }}>
      <View
        ref={canvasRef}
        collapsable={false}
        style={[
          styles.canvas,
          {
            width: widthPx,
            height: heightPx,
            backgroundColor: design.background || '#FFFFFF',
          },
        ]}
        // PanResponder wants a plain ViewResponse props spread; these props are
        // generated by RN and are safe to spread directly.
        {...mover.panHandlers}
        accessibilityLabel="Design canvas"
      >
        {design.layers.map((layer) => (
          <LayerItem key={layer.id} layer={layer} scale={scale} />
        ))}

        {selected ? (
          <View
            pointerEvents="none"
            style={[
              styles.outline,
              {
                left: selected.x * scale,
                top: selected.y * scale,
                width: Math.max(1, selected.w * scale),
                height: Math.max(1, selected.h * scale),
              },
            ]}
          />
        ) : null}
      </View>

      {selected ? (
        <View
          style={[
            styles.handle,
            {
              left: selected.x * scale + selected.w * scale - HANDLE_SIZE / 2,
              top: selected.y * scale + selected.h * scale - HANDLE_SIZE / 2,
            },
          ]}
          {...resizer.panHandlers}
          accessibilityRole="adjustable"
          accessibilityLabel="Resize selected layer"
          accessibilityHint="Drag to resize"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    overflow: 'hidden',
    borderRadius: 2,
  },
  clip: {
    overflow: 'hidden',
  },
  outline: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: colors.mintDeep,
    borderStyle: 'dashed',
  },
  handle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.mintDeep,
  },
});

export default DesignCanvas;
