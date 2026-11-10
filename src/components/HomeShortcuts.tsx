/**
 * Compact quick-tool shortcuts for the Home screen.
 *
 * Five at most, one tight row of icon tiles: enough to reach the tools a student
 * actually uses, without turning Home into another toolbox.
 */
import { useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, shadow, type ToolAccent, toolAccents } from '../theme';
import { CheckIcon, ChevronRightIcon, CloseIcon, PlusIcon } from './Icons';
import type { ReadyToolDefinition, ReadyToolId } from '../tools/types';

/** Short labels so five tiles fit: "Formula Sheet" reads as "Formula". */
const SHORT_LABELS: Partial<Record<ReadyToolId, string>> = {
  design: 'Design',
  collage: 'Collage',
  slice: 'Poster',
  idphoto: 'ID photo',
  mcq: 'MCQ',
  formula: 'Formula',
};

function accentOf(tool: ReadyToolDefinition): { bg: string; fg: string } {
  return toolAccents[tool.accent as ToolAccent] ?? toolAccents.mint;
}

function shortLabel(tool: ReadyToolDefinition): string {
  return SHORT_LABELS[tool.id] ?? tool.name;
}

type RowProps = {
  tools: ReadyToolDefinition[];
  onOpenTool: (id: ReadyToolId) => void;
  onEdit: () => void;
};

export function HomeShortcuts({ tools, onOpenTool, onEdit }: RowProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>QUICK TOOLS</Text>
        <Pressable
          onPress={onEdit}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Edit home shortcuts"
          style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
        >
          <Text style={styles.editText}>Edit</Text>
          <ChevronRightIcon size={12} color={colors.mintDeep} strokeWidth={2.4} />
        </Pressable>
      </View>

      {tools.length === 0 ? (
        <Pressable
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel="Add home shortcuts"
          style={({ pressed }) => [styles.emptyRow, pressed && styles.pressed]}
        >
          <PlusIcon size={15} color={colors.mintDark} strokeWidth={2.4} />
          <Text style={styles.emptyText}>Add up to 5 tools to Home</Text>
        </Pressable>
      ) : (
        <View style={styles.row}>
          {tools.map((tool) => {
            const accent = accentOf(tool);
            return (
              <Pressable
                key={tool.id}
                onPress={() => onOpenTool(tool.id)}
                accessibilityRole="button"
                accessibilityLabel={tool.name}
                style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
              >
                <View style={[styles.iconWrap, { backgroundColor: accent.bg }]}>
                  <tool.Icon size={18} color={accent.fg} strokeWidth={2} />
                </View>
                <Text style={styles.tileLabel} numberOfLines={1}>
                  {shortLabel(tool)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

type PickerProps = {
  visible: boolean;
  tools: ReadyToolDefinition[];
  selected: ReadyToolId[];
  max: number;
  onToggle: (id: ReadyToolId) => void;
  onClose: () => void;
};

export function ShortcutPicker({
  visible,
  tools,
  selected,
  max,
  onToggle,
  onClose,
}: PickerProps) {
  const insets = useSafeAreaInsets();
  const full = selected.length >= max;

  const hint = useMemo(() => {
    if (full) return `${max} of ${max} chosen — remove one to swap.`;
    return `${selected.length} of ${max} chosen.`;
  }, [full, max, selected.length]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.pickerBackdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <View style={[styles.picker, { paddingBottom: insets.bottom + 14 }]}>
          <View style={styles.grabber} />
          <View style={styles.pickerHeader}>
            <View style={styles.pickerHeaderText}>
              <Text style={styles.pickerTitle}>Home shortcuts</Text>
              <Text style={styles.pickerHint}>{hint}</Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Done"
              style={({ pressed }) => [styles.doneButton, pressed && styles.pressed]}
            >
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.pickerList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.pickerListContent}
          >
            {tools.map((tool) => {
              const isOn = selected.includes(tool.id);
              const disabled = !isOn && full;
              const accent = accentOf(tool);
              return (
                <Pressable
                  key={tool.id}
                  onPress={() => onToggle(tool.id)}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel={tool.name}
                  accessibilityState={{ selected: isOn, disabled }}
                  style={({ pressed }) => [
                    styles.pickerRow,
                    pressed && !disabled && styles.pressed,
                    disabled && styles.disabled,
                  ]}
                >
                  <View style={[styles.pickerIcon, { backgroundColor: accent.bg }]}>
                    <tool.Icon size={16} color={accent.fg} strokeWidth={2} />
                  </View>
                  <View style={styles.pickerBody}>
                    <Text style={styles.pickerName}>{tool.name}</Text>
                    <Text style={styles.pickerBlurb} numberOfLines={1}>
                      {tool.blurb}
                    </Text>
                  </View>
                  <View style={[styles.check, isOn && styles.checkOn]}>
                    {isOn ? <CheckIcon size={13} color={colors.white} strokeWidth={3} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close shortcut picker"
            style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
          >
            <Text style={styles.cancelText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#F1F5F2',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    ...shadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: fonts.semibold,
    fontSize: 9,
    letterSpacing: 1.6,
    color: colors.muted,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  editText: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    color: colors.mintDark,
  },
  row: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 4,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    paddingVertical: 2,
  },
  tilePressed: {
    opacity: 0.7,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontFamily: fonts.medium,
    fontSize: 8.5,
    color: colors.body,
    textAlign: 'center',
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.mintMist,
    borderWidth: 1,
    borderColor: '#E2F6EC',
  },
  emptyText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.mintDark,
  },
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.38,
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(14,26,21,0.42)',
    justifyContent: 'flex-end',
  },
  picker: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 18,
    paddingTop: 10,
    ...shadow.float,
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: 12,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  pickerHeaderText: {
    flex: 1,
  },
  pickerTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  pickerHint: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    color: colors.muted,
    marginTop: 3,
  },
  doneButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
  },
  doneText: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    color: colors.white,
  },
  pickerList: {
    maxHeight: 360,
    marginTop: 8,
  },
  pickerListContent: {
    paddingBottom: 4,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: '#F4F7F5',
  },
  pickerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerBody: {
    flex: 1,
  },
  pickerName: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.ink,
  },
  pickerBlurb: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.muted,
    marginTop: 1,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: colors.mintDeep,
    borderColor: colors.mintDeep,
  },
  cancel: {
    marginTop: 10,
    paddingVertical: 13,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: fonts.semibold,
    fontSize: 12.5,
    color: colors.body,
  },
});
