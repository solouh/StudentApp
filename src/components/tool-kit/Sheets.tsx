import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, shadow } from '../../theme';

export type SheetAction = {
  key: string;
  label: string;
  caption?: string;
  icon?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

/** Bottom action sheet used for print / share / save outputs. */
export function ActionSheet({
  visible,
  title,
  message,
  actions,
  onClose,
}: {
  visible: boolean;
  title: string;
  message?: string;
  actions: SheetAction[];
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 14 }]}>
          <View style={styles.grabber} />
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          {actions.map((action) => (
            <Pressable
              key={action.key}
              onPress={() => {
                onClose();
                action.onPress();
              }}
              disabled={action.disabled}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              style={({ pressed }) => [
                styles.action,
                pressed && styles.pressed,
                action.disabled && styles.disabled,
              ]}
            >
              {action.icon ? <View style={styles.actionIcon}>{action.icon}</View> : null}
              <View style={styles.actionBody}>
                <Text
                  style={[styles.actionLabel, action.destructive && styles.destructive]}
                >
                  {action.label}
                </Text>
                {action.caption ? (
                  <Text style={styles.actionCaption}>{action.caption}</Text>
                ) : null}
              </View>
            </Pressable>
          ))}

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/** Blocking progress modal for expensive image / print work. */
export function BusyOverlay({
  visible,
  message,
  hint,
}: {
  visible: boolean;
  message: string;
  hint?: string;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={styles.busyBackdrop}>
        <View style={styles.busyCard}>
          <ActivityIndicator color={colors.mintDeep} size="large" />
          <Text style={styles.busyMessage}>{message}</Text>
          {hint ? <Text style={styles.busyHint}>{hint}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(14,26,21,0.42)',
    justifyContent: 'flex-end',
  },
  sheet: {
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
    marginBottom: 14,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  message: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.body,
    marginTop: 5,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F4F7F5',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.mintMist,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionBody: {
    flex: 1,
  },
  actionLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13.5,
    color: colors.ink,
  },
  actionCaption: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    color: colors.muted,
    marginTop: 2,
  },
  destructive: {
    color: colors.danger,
  },
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.4,
  },
  cancel: {
    marginTop: 12,
    paddingVertical: 13,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  cancelLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12.5,
    color: colors.body,
  },
  busyBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14,26,21,0.34)',
    padding: 32,
  },
  busyCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingVertical: 24,
    paddingHorizontal: 28,
    alignItems: 'center',
    minWidth: 210,
    ...shadow.float,
  },
  busyMessage: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.ink,
    marginTop: 14,
    textAlign: 'center',
  },
  busyHint: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    lineHeight: 16,
    color: colors.muted,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 230,
  },
});
