import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../../theme';
import { ChevronLeftIcon } from '../Icons';

type Props = {
  title: string;
  subtitle?: string;
  onBack: () => void;
  right?: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
};

/** Shared full-screen scaffold for every tool: back button, title, scroll body. */
export function ToolScaffold({
  title,
  subtitle,
  onBack,
  right,
  footer,
  scroll = true,
  children,
  contentStyle,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
        >
          <ChevronLeftIcon size={20} color={colors.ink} strokeWidth={2.2} />
        </Pressable>

        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.right}>{right}</View>
      </View>

      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            contentStyle,
            { paddingBottom: (footer ? 20 : 0) + insets.bottom + 28 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.content, contentStyle]}>{children}</View>
      )}

      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.82,
  },
  titleWrap: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    color: colors.muted,
    marginTop: 2,
  },
  right: {
    minWidth: 42,
    alignItems: 'flex-end',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
