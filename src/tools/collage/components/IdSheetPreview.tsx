import { StyleSheet, View } from 'react-native';
import { getPaper } from '../../../lib/print/a4';
import { colors } from '../../../theme';
import { idSheetLayout, type IdDoc } from '../model';
import { FittedPhoto } from './CollagePreview';

/** Physical sheet preview: 4R / A4 with repeated ID photos and cut guides. */
export function IdSheetPreview({ doc, width }: { doc: IdDoc; width: number }) {
  const paper = getPaper(doc.paper);
  const height = (width * paper.h) / paper.w;
  const pxPerMm = width / paper.w;
  const rects = idSheetLayout(doc.size, doc.paper, doc.copies, doc.gutterMm);

  return (
    <View style={[styles.sheet, { width, height }]}>
      {rects.map((rect, index) => {
        const cellW = rect.w * pxPerMm;
        const cellH = rect.h * pxPerMm;
        return (
          <View
            key={`id-${index}`}
            style={[
              styles.cell,
              { left: rect.x * pxPerMm, top: rect.y * pxPerMm, width: cellW, height: cellH },
            ]}
          >
            <FittedPhoto photo={doc.photo} crop={doc.crop} boxW={cellW} boxH={cellH} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E6ECE8',
    overflow: 'hidden',
  },
  cell: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderColor: '#C9D6D0',
    overflow: 'hidden',
  },
});
