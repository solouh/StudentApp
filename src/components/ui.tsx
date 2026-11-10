import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, fonts, radius } from '../theme';
import { ChevronRightIcon } from './Icons';

/* ---------------------------------------------------------------- */
/* Titles                                                            */
/* ---------------------------------------------------------------- */

export function ScreenTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.screenTitle}>{children}</Text>;
}

export function SectionHeader({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onPress} style={styles.action} hitSlop={8}>
          <Text style={styles.actionText}>{action}</Text>
          <ChevronRightIcon size={13} color={colors.mintDeep} strokeWidth={2.4} />
        </Pressable>
      ) : null}
    </View>
  );
}

/* ---------------------------------------------------------------- */
/* Progress ring (SVG)                                               */
/* ---------------------------------------------------------------- */

export function ProgressRing({
  size = 196,
  stroke = 12,
  progress,
  trackColor = colors.mintSoft,
  color = colors.mintDeep,
  children,
}: {
  size?: number;
  stroke?: number;
  progress: number;
  trackColor?: string;
  color?: string;
  children?: ReactNode;
}) {
  const radiusValue = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radiusValue;
  const clamped = Math.min(1, Math.max(0, progress));
  const offset = circumference * (1 - clamped);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={[circumference, circumference]}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

/* ---------------------------------------------------------------- */
/* Small pieces                                                      */
/* ---------------------------------------------------------------- */

export function Pill({
  label,
  tone = 'mint',
  icon,
}: {
  label: string;
  tone?: 'mint' | 'dark' | 'light';
  icon?: ReactNode;
}) {
  const bg =
    tone === 'mint' ? colors.mintSoft : tone === 'dark' ? colors.ink : '#F3F6F4';
  const fg = tone === 'mint' ? colors.mintDark : tone === 'dark' ? colors.white : colors.body;

  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {icon ? <View style={styles.pillIcon}>{icon}</View> : null}
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

/* ---------------------------------------------------------------- */
/* Segmented control                                                */
/* ---------------------------------------------------------------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  formatLabel,
  style,
}: {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  formatLabel?: (option: T) => string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.segmented, style]}>
      {options.map((option) => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[styles.segment, active && styles.segmentActive]}
            accessibilityRole="button"
            accessibilityLabel={formatLabel ? formatLabel(option) : option}
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
              {formatLabel ? formatLabel(option) : option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    fontFamily: fonts.bold,
    fontSize: 25,
    lineHeight: 33,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.ink,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.mintDark,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  pillIcon: {
    marginRight: 5,
  },
  pillText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.line,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.ink,
  },
  segmentText: {
    fontFamily: fonts.semibold,
    fontSize: 10.5,
    letterSpacing: 0.6,
    color: colors.muted,
  },
  segmentTextActive: {
    color: colors.white,
  },
});
