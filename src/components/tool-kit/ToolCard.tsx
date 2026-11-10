import type { ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { IconProps } from '../Icons';
import { toolAccents, type ToolAccent } from '../../theme';
import { colors, fonts, radius, shadow } from '../../theme';

type TileProps = {
  name: string;
  blurb: string;
  Icon: ComponentType<IconProps>;
  accent: ToolAccent;
  badge?: string;
  onPress: () => void;
};

/** Grid tile for a shipped tool in the Toolbox hub. */
export function ToolTile({ name, blurb, Icon, accent, badge, onPress }: TileProps) {
  const tint = toolAccents[accent];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View style={[styles.iconTile, { backgroundColor: tint.bg }]}>
        <Icon size={22} color={tint.fg} strokeWidth={1.9} />
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <Text style={styles.tileName}>{name}</Text>
      <Text style={styles.tileBlurb} numberOfLines={2}>
        {blurb}
      </Text>
    </Pressable>
  );
}

type RowProps = {
  name: string;
  blurb: string;
  Icon: ComponentType<IconProps>;
  accent: ToolAccent;
  phaseLabel: string;
};

/** Read-only roadmap row (planned tools). */
export function PlannedToolRow({ name, blurb, Icon, accent, phaseLabel }: RowProps) {
  const tint = toolAccents[accent];

  return (
    <View style={styles.row} accessibilityLabel={`${name}, planned`}>
      <View style={[styles.rowIcon, { backgroundColor: tint.bg }]}>
        <Icon size={19} color={tint.fg} strokeWidth={1.9} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowName}>{name}</Text>
        <Text style={styles.rowBlurb}>{blurb}</Text>
      </View>
      <View style={styles.phasePill}>
        <Text style={styles.phaseText}>{phaseLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#F1F5F2',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 15,
    minHeight: 128,
    ...shadow.card,
  },
  pressed: {
    opacity: 0.9,
  },
  iconTile: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 13,
    right: 12,
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: 7.5,
    letterSpacing: 0.8,
    color: colors.white,
  },
  tileName: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.ink,
    marginTop: 12,
  },
  tileBlurb: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.muted,
    marginTop: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#F1F5F2',
    padding: 12,
    marginBottom: 9,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  rowName: {
    fontFamily: fonts.semibold,
    fontSize: 12.5,
    color: colors.ink,
  },
  rowBlurb: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.muted,
    marginTop: 2,
  },
  phasePill: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  phaseText: {
    fontFamily: fonts.semibold,
    fontSize: 8.5,
    letterSpacing: 0.3,
    color: colors.muted,
  },
});
