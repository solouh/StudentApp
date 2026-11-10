import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckIcon, ChevronRightIcon, FlameIcon } from '../components/Icons';
import { ScreenTitle } from '../components/ui';
import { useActivity } from '../lib/activity/ActivityContext';
import {
  currentStreak,
  dailyXp,
  formatMinutes,
  subjectFocusMinutes,
} from '../lib/activity/derive';
import { SUBJECTS } from '../lib/subjects';
import { colors, fonts, radius, shadow } from '../theme';

export default function SubjectsScreen() {
  const insets = useSafeAreaInsets();
  const { events } = useActivity();
  const [selected, setSelected] = useState<string>(SUBJECTS[0].id);

  const now = new Date();
  const streak = currentStreak(events, now);
  const weekSeries = dailyXp(events, now, 7);
  const weekMax = Math.max(1, ...weekSeries);
  const weekMinutes = subjectFocusMinutes(events, now, 7);

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

        <View style={styles.streakCard}>
          <View style={styles.flameBadge}>
            <FlameIcon size={20} color="#E4794F" strokeWidth={2} />
          </View>
          <View style={styles.streakText}>
            <Text style={styles.streakValue}>{streak} day streak</Text>
            <Text style={styles.streakSub}>
              {streak > 0
                ? "You're on fire — keep it going"
                : 'Log one session to start a streak'}
            </Text>
          </View>
          <View style={styles.streakBars}>
            {weekSeries.map((xp, index) => (
              <View
                key={index}
                style={[
                  styles.streakBar,
                  {
                    height: 6 + Math.round((xp / weekMax) * 14),
                    backgroundColor:
                      index === weekSeries.length - 1 ? colors.mintDeep : 'rgba(47,191,146,0.28)',
                  },
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.list}>
          {SUBJECTS.map((subject) => {
            const isSelected = selected === subject.id;
            const minutes = weekMinutes[subject.id] ?? 0;
            return (
              <Pressable
                key={subject.id}
                onPress={() => setSelected(subject.id)}
                style={({ pressed }) => [
                  styles.subjectCard,
                  isSelected && styles.subjectCardSelected,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={subject.name}
              >
                <View style={[styles.iconTile, { backgroundColor: subject.tint.bg }]}>
                  <Text style={styles.iconEmoji}>{subject.emoji}</Text>
                </View>

                <View style={styles.subjectBody}>
                  <Text style={styles.subjectName}>{subject.name}</Text>
                  <Text style={styles.subjectMeta}>
                    {subject.lessonCount} lessons · {formatMinutes(minutes)} this week
                  </Text>
                </View>

                {subject.completed ? (
                  <View style={styles.completedPill}>
                    <CheckIcon size={11} color={colors.mintDark} strokeWidth={2.6} />
                    <Text style={styles.completedText}>Completed</Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.chevron,
                      isSelected && { backgroundColor: colors.mintSoft },
                    ]}
                  >
                    <ChevronRightIcon
                      size={14}
                      color={isSelected ? colors.mintDark : colors.muted}
                      strokeWidth={2.4}
                    />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
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
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.mintMist,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E2F6EC',
    padding: 14,
    marginTop: 18,
    ...shadow.card,
  },
  flameBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FCEBDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakText: {
    flex: 1,
    marginLeft: 12,
  },
  streakValue: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.ink,
  },
  streakSub: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    color: colors.body,
    marginTop: 2,
  },
  streakBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 24,
  },
  streakBar: {
    width: 4,
    borderRadius: 2,
  },
  list: {
    marginTop: 16,
    gap: 10,
  },
  subjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: '#F0F4F1',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  subjectCardSelected: {
    borderColor: colors.mint,
    backgroundColor: '#FBFEFC',
  },
  pressed: {
    opacity: 0.92,
  },
  iconTile: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 22,
    lineHeight: 28,
  },
  subjectBody: {
    flex: 1,
    marginLeft: 12,
  },
  subjectName: {
    fontFamily: fonts.semibold,
    fontSize: 13.5,
    color: colors.ink,
  },
  subjectMeta: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    color: colors.muted,
    marginTop: 2,
  },
  completedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.mintSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  completedText: {
    fontFamily: fonts.semibold,
    fontSize: 9.5,
    color: colors.mintDark,
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
