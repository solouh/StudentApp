import type { RefObject } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { HostInstance } from 'react-native';
import { PlusIcon } from '../../../components/Icons';
import { getPaper, layoutCellsMm } from '../../../lib/print/a4';
import type { Crop, Photo } from '../../../lib/media/types';
import { colors, fonts } from '../../../theme';
import { aspectAdjustedCrop, type CollageDoc } from '../model';

/** Renders a cell photo at an exact crop rect (already aspect-locked). */
export function FittedPhoto({
  photo,
  crop,
  boxW,
  boxH,
}: {
  photo: Photo;
  crop: Crop;
  boxW: number;
  boxH: number;
}) {
  const displayedW = boxW / Math.max(crop.w, 0.0001);
  const displayedH = boxH / Math.max(crop.h, 0.0001);

  return (
    <Image
      source={{ uri: photo.uri }}
      resizeMode="stretch"
      style={{
        position: 'absolute',
        width: displayedW,
        height: displayedH,
        left: -crop.x * displayedW,
        top: -crop.y * displayedH,
      }}
    />
  );
}

type Props = {
  doc: CollageDoc;
  width: number;
  onCellPress: (index: number) => void;
  captureTargetRef?: RefObject<HostInstance | null>;
};

/** WYSIWYG A4/4R preview of the collage, also used as the PNG capture target. */
export function CollagePreview({ doc, width, onCellPress, captureTargetRef }: Props) {
  const paper = getPaper(doc.paper);
  const height = (width * paper.h) / paper.w;
  const pxPerMm = width / paper.w;
  const cells = layoutCellsMm({
    paper,
    marginMm: doc.marginMm,
    gutterMm: doc.gutterMm,
    rows: doc.rows,
    cols: doc.cols,
  });
  const radiusPx = Math.max(0, doc.radiusMm * pxPerMm);

  return (
    <View
      ref={captureTargetRef}
      collapsable={false}
      style={[styles.sheet, { width, height, backgroundColor: doc.background }]}
    >
      {cells.map((rect, index) => {
        const cell = doc.cells[index];
        const cellW = rect.w * pxPerMm;
        const cellH = rect.h * pxPerMm;
        const aspect = rect.w / rect.h;

        return (
          <Pressable
            key={`cell-${index}`}
            onPress={() => onCellPress(index)}
            accessibilityRole="button"
            accessibilityLabel={
              cell?.photo ? `Photo ${index + 1}, tap to adjust` : `Empty slot ${index + 1}`
            }
            style={[
              styles.cell,
              {
                left: rect.x * pxPerMm,
                top: rect.y * pxPerMm,
                width: cellW,
                height: cellH,
              },
              doc.radiusMm > 0 ? { borderRadius: radiusPx, overflow: 'hidden' } : null,
            ]}
          >
            {cell?.photo ? (
              <FittedPhoto
                photo={cell.photo}
                crop={aspectAdjustedCrop(cell.photo, cell.crop, aspect)}
                boxW={cellW}
                boxH={cellH}
              />
            ) : (
              <View style={styles.emptyCell}>
                <PlusIcon size={16} color={colors.muted} strokeWidth={2} />
                <Text style={styles.emptyText}>Add</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    alignSelf: 'center',
    borderRadius: 2,
    overflow: 'hidden',
  },
  cell: {
    position: 'absolute',
    backgroundColor: '#F4F8F6',
  },
  emptyCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#DDE7E2',
    borderRadius: 4,
  },
  emptyText: {
    fontFamily: fonts.medium,
    fontSize: 8.5,
    color: colors.muted,
  },
});
