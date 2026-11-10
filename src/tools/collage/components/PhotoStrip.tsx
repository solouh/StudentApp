import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CloseIcon, PlusIcon } from '../../../components/Icons';
import { colors, fonts, radius } from '../../../theme';
import { aspectAdjustedCrop, MAX_COLLAGE_PHOTOS, type CollageCell } from '../model';
import { FittedPhoto } from './CollagePreview';

type Props = {
  cells: CollageCell[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onEdit: (index: number) => void;
};

/** Horizontal strip of the selected photos plus an add tile. */
export function PhotoStrip({ cells, onAdd, onRemove, onEdit }: Props) {
  const filled = cells
    .map((cell, index) => ({ cell, index }))
    .filter((entry): entry is { cell: CollageCell & { photo: NonNullable<CollageCell['photo']> }; index: number } =>
      entry.cell.photo !== null,
    );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {filled.map(({ cell, index }) => (
        <View key={cell.photo.id + index} style={styles.thumbWrap}>
          <Pressable
            onPress={() => onEdit(index)}
            accessibilityRole="button"
            accessibilityLabel={`Adjust photo ${index + 1}`}
            style={({ pressed }) => [styles.thumb, pressed && styles.pressed]}
          >
            <FittedPhoto
              photo={cell.photo}
              crop={aspectAdjustedCrop(cell.photo, cell.crop, 1)}
              boxW={64}
              boxH={64}
            />
          </Pressable>
          <Pressable
            onPress={() => onRemove(index)}
            accessibilityRole="button"
            accessibilityLabel={`Remove photo ${index + 1}`}
            hitSlop={8}
            style={styles.remove}
          >
            <CloseIcon size={9} color={colors.white} strokeWidth={3} />
          </Pressable>
        </View>
      ))}

      {filled.length < MAX_COLLAGE_PHOTOS ? (
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel="Add photos"
          style={({ pressed }) => [styles.addTile, pressed && styles.pressed]}
        >
          <PlusIcon size={18} color={colors.mintDark} strokeWidth={2.2} />
          <Text style={styles.addText}>Add</Text>
        </Pressable>
      ) : null}

      {filled.length === 0 ? (
        <Text style={styles.hint}>Add up to 9 photos to build your sheet.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  thumbWrap: {
    width: 64,
    height: 64,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.86,
  },
  remove: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  addTile: {
    width: 64,
    height: 64,
    borderRadius: 15,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.mint,
    backgroundColor: colors.mintMist,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addText: {
    fontFamily: fonts.semibold,
    fontSize: 9,
    color: colors.mintDark,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    color: colors.muted,
    maxWidth: 190,
  },
});
