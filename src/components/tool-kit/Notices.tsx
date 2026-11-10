import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '../../theme';
import { PhotoIcon } from '../Icons';

type Tone = 'info' | 'error' | 'success';

const TONES: Record<Tone, { bg: string; fg: string; border: string }> = {
  info: { bg: colors.mintMist, fg: colors.mintDark, border: '#E2F6EC' },
  success: { bg: colors.mintMist, fg: colors.mintDark, border: '#E2F6EC' },
  error: { bg: '#FDF0EE', fg: '#C0503F', border: '#F8DDD8' },
};

/** Inline status strip for permissions and recoverable errors. */
export function InlineNotice({
  tone = 'info',
  message,
  actionLabel,
  onAction,
}: {
  tone?: Tone;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const palette = TONES[tone];

  return (
    <View
      style={[styles.notice, { backgroundColor: palette.bg, borderColor: palette.border }]}
    >
      <Text style={[styles.noticeText, { color: palette.fg }]}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => [styles.noticeAction, pressed && styles.pressed]}
        >
          <Text style={[styles.noticeActionText, { color: palette.fg }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Empty / zero-state used inside tools (no photos yet, nothing to print). */
export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
  icon,
}: {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>{icon ?? <PhotoIcon size={26} color={colors.mintDark} />}</View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => [styles.emptyAction, pressed && styles.pressed]}
        >
          <Text style={styles.emptyActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noticeText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 11.5,
    lineHeight: 17,
  },
  noticeAction: {
    paddingVertical: 2,
  },
  noticeActionText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 34,
    paddingHorizontal: 22,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 16,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: colors.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.ink,
    marginTop: 13,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.body,
    marginTop: 5,
    textAlign: 'center',
    maxWidth: 260,
  },
  emptyAction: {
    marginTop: 15,
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  emptyActionText: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    letterSpacing: 0.4,
    color: colors.white,
  },
  pressed: {
    opacity: 0.86,
  },
});
