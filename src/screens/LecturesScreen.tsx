import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlayIcon } from '../components/Icons';
import { ScreenTitle } from '../components/ui';
import { colors, fonts, radius, shadow } from '../theme';

type Lecture = {
  title: string;
  emoji: string;
  minutes: string;
  colors: readonly [string, string];
};

type Row = { title: string; items: Lecture[] };

const ROWS: Row[] = [
  {
    title: 'Introduction to Biology',
    items: [
      {
        title: 'Cell Structure',
        emoji: '🧬',
        minutes: '12 min',
        colors: ['#7FE3C0', '#33C79B'],
      },
      {
        title: 'Photosynthesis',
        emoji: '🌿',
        minutes: '18 min',
        colors: ['#B7A8F7', '#8A73E8'],
      },
      {
        title: 'Genetics 101',
        emoji: '🧪',
        minutes: '24 min',
        colors: ['#F7C48A', '#E79F5C'],
      },
      {
        title: 'Ecosystems',
        emoji: '🌍',
        minutes: '15 min',
        colors: ['#8FC7F5', '#5C9FE0'],
      },
    ],
  },
  {
    title: 'Popular lessons',
    items: [
      {
        title: 'Biology Basics',
        emoji: '🔬',
        minutes: '10 min',
        colors: ['#8FE9CC', '#3FCFA5'],
      },
      {
        title: 'Chemistry Lab',
        emoji: '⚗️',
        minutes: '22 min',
        colors: ['#9BB8F7', '#6B8DE8'],
      },
      {
        title: 'Physics Motion',
        emoji: '🪐',
        minutes: '19 min',
        colors: ['#F2C97B', '#DFA94B'],
      },
    ],
  },
  {
    title: 'Life sciences',
    items: [
      {
        title: 'Human Anatomy',
        emoji: '🫀',
        minutes: '26 min',
        colors: ['#F7A8B8', '#E87A90'],
      },
      {
        title: 'Plant Growth',
        emoji: '🌱',
        minutes: '14 min',
        colors: ['#A8E6A1', '#6FC96A'],
      },
      {
        title: 'Marine Life',
        emoji: '🐬',
        minutes: '20 min',
        colors: ['#8FD6F5', '#4FB3E0'],
      },
    ],
  },
];

function LectureCard({ lecture }: { lecture: Lecture }) {
  return (
    <Pressable style={({ pressed }) => [styles.cardShadow, pressed && styles.pressed]}>
      <LinearGradient
        colors={lecture.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.cardBlob} />
        <View style={styles.playBadge}>
          <PlayIcon size={13} color={colors.ink} />
        </View>
        <Text style={styles.cardEmoji}>{lecture.emoji}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {lecture.title}
          </Text>
          <Text style={styles.cardMeta}>Video topic · {lecture.minutes}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default function LecturesScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 130 },
        ]}
      >
        <ScreenTitle>
          What are you going to{'\n'}study today?
        </ScreenTitle>

        {ROWS.map((row) => (
          <View key={row.title} style={styles.row}>
            <Text style={styles.rowTitle}>{row.title}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rowScroll}
            >
              {row.items.map((lecture) => (
                <LectureCard key={lecture.title} lecture={lecture} />
              ))}
            </ScrollView>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: 20,
  },
  row: {
    marginTop: 24,
  },
  rowTitle: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 12,
  },
  rowScroll: {
    gap: 12,
    paddingRight: 20,
  },
  cardShadow: {
    borderRadius: radius.md,
    ...shadow.card,
  },
  pressed: {
    opacity: 0.92,
  },
  card: {
    width: 138,
    height: 156,
    borderRadius: radius.md,
    padding: 12,
    overflow: 'hidden',
  },
  cardBlob: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.20)',
    top: -34,
    right: -26,
  },
  playBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: {
    fontSize: 30,
    lineHeight: 38,
    marginTop: 26,
  },
  cardFooter: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 11,
  },
  cardTitle: {
    fontFamily: fonts.semibold,
    fontSize: 12.5,
    color: '#0E1A15',
  },
  cardMeta: {
    fontFamily: fonts.medium,
    fontSize: 9,
    color: 'rgba(14,26,21,0.62)',
    marginTop: 2,
  },
});
