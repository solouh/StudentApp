import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow } from '../theme';
import { BookIcon, GridIcon, HomeIcon, StarIcon, ToolsIcon } from './Icons';

export type TabKey = 'home' | 'lectures' | 'focus' | 'subjects' | 'tools';

const TABS: { key: TabKey; label: string; Icon: typeof HomeIcon }[] = [
  { key: 'home', label: 'Home', Icon: HomeIcon },
  { key: 'lectures', label: 'Lectures', Icon: BookIcon },
  { key: 'focus', label: 'Focus', Icon: StarIcon },
  { key: 'subjects', label: 'Subjects', Icon: GridIcon },
  { key: 'tools', label: 'Tools', Icon: ToolsIcon },
];

type Props = {
  active: TabKey;
  onChange: (key: TabKey) => void;
};

export default function BottomNav({ active, onChange }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.bar}>
        {TABS.map(({ key, label, Icon }) => {
          const isActive = key === active;
          return (
            <Pressable
              key={key}
              onPress={() => onChange(key)}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: isActive }}
              style={styles.item}
              hitSlop={6}
            >
              <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                <Icon
                  size={21}
                  color={isActive ? colors.ink : colors.muted}
                  strokeWidth={isActive ? 2.1 : 1.8}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    // A soft rounded rectangle instead of the full capsule: the nav reads as a
    // card, not a pill.
    borderRadius: radius.md,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#F1F5F2',
    ...shadow.float,
  },
  item: {
    paddingHorizontal: 5,
    paddingVertical: 6,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.mintSoft,
  },
});
