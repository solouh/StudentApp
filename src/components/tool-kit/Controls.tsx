import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, fonts, radius, shadow } from '../../theme';

/* ---------------------------------------------------------------- */
/* Buttons                                                           */
/* ---------------------------------------------------------------- */

type ButtonTone = 'dark' | 'mint' | 'light' | 'outline';

export function ToolButton({
  label,
  onPress,
  icon,
  tone = 'dark',
  disabled = false,
  loading = false,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  tone?: ButtonTone;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [
        styles.button,
        tone === 'dark' && styles.buttonDark,
        tone === 'mint' && styles.buttonMint,
        tone === 'light' && styles.buttonLight,
        tone === 'outline' && styles.buttonOutline,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {icon}
      <Text
        style={[
          styles.buttonLabel,
          tone === 'dark' && styles.buttonLabelDark,
          tone === 'mint' && styles.buttonLabelMint,
          tone === 'light' && styles.buttonLabelLight,
          tone === 'outline' && styles.buttonLabelOutline,
        ]}
      >
        {loading ? 'Working…' : label}
      </Text>
    </Pressable>
  );
}

/* ---------------------------------------------------------------- */
/* Chips                                                             */
/* ---------------------------------------------------------------- */

export function OptionChip({
  label,
  active,
  onPress,
  disabled = false,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active, disabled }}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </Pressable>
  );
}

/* ---------------------------------------------------------------- */
/* Stepper                                                           */
/* ---------------------------------------------------------------- */

export function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (next: number) => void;
}) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  return (
    <View style={styles.stepperRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable
          onPress={() => onChange(clamp(value - step))}
          disabled={value <= min}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          style={({ pressed }) => [
            styles.stepperButton,
            pressed && styles.pressed,
            value <= min && styles.disabled,
          ]}
        >
          <Text style={styles.stepperSymbol}>−</Text>
        </Pressable>

        <Text style={styles.stepperValue}>
          {value}
          {suffix ? <Text style={styles.stepperSuffix}>{suffix}</Text> : null}
        </Text>

        <Pressable
          onPress={() => onChange(clamp(value + step))}
          disabled={value >= max}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          style={({ pressed }) => [
            styles.stepperButton,
            pressed && styles.pressed,
            value >= max && styles.disabled,
          ]}
        >
          <Text style={styles.stepperSymbol}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ---------------------------------------------------------------- */
/* Text field                                                        */
/* ---------------------------------------------------------------- */

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  maxLength = 60,
}: {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        maxLength={maxLength}
        style={styles.fieldInput}
        accessibilityLabel={label ?? placeholder}
      />
    </View>
  );
}

/* ---------------------------------------------------------------- */
/* Slider (PanResponder, no extra dependency)                        */
/* ---------------------------------------------------------------- */

export function SliderRow({
  label,
  value,
  min,
  max,
  step = 0.1,
  disabled = false,
  formatValue,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  formatValue?: (value: number) => string;
  onChange: (next: number) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const widthRef = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: (event) => {
          const width = widthRef.current;
          if (width <= 0) return;
          const ratio = Math.min(1, Math.max(0, event.nativeEvent.locationX / width));
          const raw = min + ratio * (max - min);
          const stepped = Math.round(raw / step) * step;
          onChangeRef.current(Number(Math.min(max, Math.max(min, stepped)).toFixed(2)));
        },
        onPanResponderMove: (event) => {
          const width = widthRef.current;
          if (width <= 0) return;
          const ratio = Math.min(1, Math.max(0, event.nativeEvent.locationX / width));
          const raw = min + ratio * (max - min);
          const stepped = Math.round(raw / step) * step;
          onChangeRef.current(Number(Math.min(max, Math.max(min, stepped)).toFixed(2)));
        },
      }),
    [disabled, min, max, step],
  );

  const ratio = max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;

  return (
    <View style={styles.sliderWrap}>
      <View style={styles.sliderHeader}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.sliderValue}>
          {formatValue ? formatValue(value) : value.toFixed(2)}
        </Text>
      </View>

      <View
        style={styles.sliderTrackHitArea}
        onLayout={(event) => {
          widthRef.current = event.nativeEvent.layout.width;
          setTrackWidth(event.nativeEvent.layout.width);
        }}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value }}
        onAccessibilityAction={(event) => {
          const delta = event.nativeEvent.actionName === 'increment' ? step : -step;
          onChangeRef.current(Number(Math.min(max, Math.max(min, value + delta)).toFixed(2)));
        }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${ratio * 100}%` }]} />
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.sliderThumb,
            { left: Math.max(0, Math.min(trackWidth - 20, ratio * trackWidth - 10)) },
            disabled && styles.disabled,
          ]}
        />
      </View>
    </View>
  );
}

/* ---------------------------------------------------------------- */
/* Small row helpers                                                 */
/* ---------------------------------------------------------------- */

export function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export function ToggleRow({
  label,
  caption,
  value,
  onChange,
}: {
  label: string;
  caption?: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        {caption ? <Text style={styles.toggleCaption}>{caption}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#DDE5E1', true: colors.mint }}
        thumbColor={colors.white}
        ios_backgroundColor="#DDE5E1"
        accessibilityLabel={label}
      />
    </View>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

const styles = StyleSheet.create({
  button: {
    height: 46,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDark: {
    backgroundColor: colors.ink,
  },
  buttonMint: {
    backgroundColor: colors.mintSoft,
  },
  buttonLight: {
    backgroundColor: '#F3F6F4',
  },
  buttonOutline: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  buttonLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  buttonLabelDark: { color: colors.white },
  buttonLabelMint: { color: colors.mintDark },
  buttonLabelLight: { color: colors.body },
  buttonLabelOutline: { color: colors.ink },
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.45,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: '#EEF2EF',
    backgroundColor: colors.white,
  },
  chipActive: {
    borderColor: colors.mint,
    backgroundColor: colors.mintMist,
  },
  chipLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: colors.body,
  },
  chipLabelActive: {
    color: colors.mintDark,
  },
  rowLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.inkSoft,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperSymbol: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.inkSoft,
    lineHeight: 19,
  },
  stepperValue: {
    minWidth: 44,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.ink,
  },
  stepperSuffix: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.muted,
  },
  fieldWrap: {
    marginTop: 14,
  },
  fieldLabel: {
    fontFamily: fonts.semibold,
    fontSize: 9,
    letterSpacing: 1.4,
    color: colors.muted,
    marginBottom: 7,
  },
  fieldInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.ink,
  },
  sliderWrap: {
    marginTop: 12,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sliderValue: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: colors.mintDark,
  },
  sliderTrackHitArea: {
    marginTop: 10,
    height: 30,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: colors.mintDeep,
  },
  sliderThumb: {
    position: 'absolute',
    top: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.mintDeep,
    ...shadow.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    gap: 12,
  },
  toggleBody: {
    flex: 1,
  },
  toggleCaption: {
    fontFamily: fonts.regular,
    fontSize: 10,
    lineHeight: 14,
    color: colors.muted,
    marginTop: 2,
  },
  sectionLabel: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.muted,
    marginTop: 20,
    marginBottom: 10,
  },
});
