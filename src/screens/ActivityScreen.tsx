import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heatmap } from '../components/activity/Heatmap';
import { ChevronLeftIcon } from '../components/Icons';
import { Pill, SectionHeader } from '../components/ui';
import { useActivity } from '../lib/activity/ActivityContext';
import {
  achievements,
  buildHeatmap,
  currentStreak,
  dayKey,
  dayTotals,
  focusStats,
  formatClock,
  formatDayLabel,
  formatMinutes,
  levelFor,
  longestStreak,
  shortHash,
  subjectBreakdown,
  totalXp,
  type Achievement,
  type SubjectShare,
} from '../lib/activity/derive';
import { KIND_LABELS, type ActivityEvent } from '../lib/activity/types';
import { getSubject } from '../lib/subjects';
import { useBackHandler } from '../lib/useBackHandler';
import { colors, fonts, gradients, radius, shadow } from '../theme';

const RECENT_LIMIT = 20;

/** Local-midnight Date for a `YYYY-MM-DD` key (`new Date(key)` would parse as UTC). */
function dateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function CommitRow({ event }: { event: ActivityEvent }) {
  const place = getSubject(event.subjectId)?.name ?? KIND_LABELS[event.kind];
  const meta = `${place} · ${formatDayLabel(new Date(event.at))} · ${formatClock(event.at)}`;
  const withered = event.kind === 'focus' && event.status === 'withered';

  return (
    <View style={styles.commit}>
      <Text style={styles.commitHash}>{shortHash(event.id)}</Text>
      <View style={styles.commitBody}>
        <Text style={styles.commitMessage} numberOfLines={2}>{event.message}</Text>
        <Text style={styles.commitMeta} numberOfLines={1}>{meta}</Text>
      </View>
      {event.xp > 0 ? (
        <View style={styles.xpChip}>
          <Text style={styles.xpChipText}>{`+${event.xp} XP`}</Text>
        </View>
      ) : withered ? (
        <View style={styles.witheredChip}>
          <Text style={styles.witheredText}>withered</Text>
        </View>
      ) : null}
    </View>
  );
}

function RepoBar({ repos }: { repos: SubjectShare[] }) {
  return (
    <View style={styles.repoBar}>
      {repos.map((repo) => (
        <View
          key={repo.subjectId}
          style={[styles.repoSegment, { width: `${repo.share * 100}%`, backgroundColor: repo.color }]}
        />
      ))}
    </View>
  );
}

function RepoRow({ repo }: { repo: SubjectShare }) {
  return (
    <View style={styles.repoRow}>
      <Text style={styles.repoEmoji}>{repo.emoji}</Text>
      <View style={styles.repoBody}>
        <Text style={styles.repoName}>{repo.name}</Text>
        <Text style={styles.repoMeta}>{`${formatMinutes(repo.minutes)} focused`}</Text>
      </View>
      <View style={styles.repoRight}>
        <Text style={styles.repoXp}>{`${repo.xp} XP`}</Text>
        <Text style={[styles.repoShare, { color: repo.color }]}>
          {`${Math.round(repo.share * 100)}%`}
        </Text>
      </View>
    </View>
  );
}

function AchievementCard({ item }: { item: Achievement }) {
  return (
    <View
      style={[
        styles.achievement,
        item.unlocked ? styles.achievementUnlocked : styles.achievementLocked,
      ]}
    >
      <View style={styles.achievementTop}>
        <Text style={[styles.achievementEmoji, !item.unlocked && styles.dimmed]}>{item.emoji}</Text>
        {item.unlocked ? <Pill label="Unlocked" tone="mint" /> : null}
      </View>
      <Text style={styles.achievementTitle}>{item.title}</Text>
      <Text style={styles.achievementBody}>{item.description}</Text>
      <View style={styles.achievementTrack}>
        <View style={[styles.achievementFill, { width: `${(item.progress / item.target) * 100}%` }]} />
      </View>
      <Text style={styles.achievementCount}>{`${item.progress}/${item.target}`}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function ActivityScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { events, hydrated, clearAll } = useActivity();
  const now = useMemo(() => new Date(), [events]);
  const [selectedKey, setSelectedKey] = useState(() => dayKey(now));

  useBackHandler(
    useCallback(() => {
      onBack();
      return true;
    }, [onBack]),
  );

  const level = useMemo(() => levelFor(totalXp(events)), [events]);
  const heat = useMemo(() => buildHeatmap(events, now), [events, now]);
  const streak = useMemo(() => currentStreak(events, now), [events, now]);
  const bestStreak = useMemo(() => longestStreak(events), [events]);
  const focusedMinutes = useMemo(() => focusStats(events, now, 3650).focusedMinutes, [events, now]);
  const days = useMemo(() => dayTotals(events), [events]);
  const repos = useMemo(() => subjectBreakdown(events), [events]);
  const badges = useMemo(() => achievements(events), [events]);
  const recent = useMemo(() => events.slice(0, RECENT_LIMIT), [events]);
  const hasDemo = useMemo(() => events.some((event) => event.demo), [events]);

  if (!hydrated) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  const selectedDate = dateFromKey(selectedKey);
  const selectedDay = days.get(selectedKey);
  const dayEvents = selectedDay?.events ?? [];
  const unlockedCount = badges.filter((badge) => badge.unlocked).length;

  const confirmClear = () => {
    Alert.alert(
      'Clear all progress?',
      'This removes every activity, including demo history. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearAll },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.root}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
        >
          <ChevronLeftIcon size={20} color={colors.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.eyebrow}>YOUR PROGRESS</Text>
          <Text style={styles.title}>Activity</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>Every session, quiz, paper and tool you use is a commit.</Text>

      <LinearGradient
        colors={gradients.dark}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.levelCard}
      >
        <Text style={styles.levelEyebrow}>{`LEVEL ${level.level}`}</Text>
        <Text style={styles.levelTitle}>{level.title}</Text>
        <View style={styles.levelRow}>
          <Text style={styles.levelXp}>{`${level.total} XP`}</Text>
          <Text style={styles.levelNext}>{`${level.xpToNext} XP to next level`}</Text>
        </View>
        <View style={styles.levelTrack}>
          <View style={[styles.levelFill, { width: `${Math.round(level.progress * 100)}%` }]} />
        </View>
      </LinearGradient>

      <View style={styles.statGrid}>
        <StatCard label="Contributions" value={`${heat.contributions}`} />
        <StatCard label="Streak" value={`${streak} d`} />
        <StatCard label="Best streak" value={`${bestStreak} d`} />
        <StatCard label="Focus" value={formatMinutes(focusedMinutes)} />
      </View>

      <SectionHeader title="Contributions" />
      <View style={styles.card}>
        <Heatmap
          columns={heat.columns}
          months={heat.months}
          cell={12}
          gap={3}
          selectedKey={selectedKey}
          onSelect={(cell) => setSelectedKey(cell.key)}
        />
        <Text style={styles.caption}>
          {`${heat.contributions} contributions in the last year · ${heat.activeDays} active days`}
        </Text>
      </View>

      <View style={styles.dayCard}>
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>{formatDayLabel(selectedDate)}</Text>
          <Text style={styles.dayMeta}>
            {`${selectedDay?.xp ?? 0} XP · ${selectedDay?.count ?? 0} commits`}
          </Text>
        </View>
        {dayEvents.length > 0 ? (
          dayEvents.map((event) => <CommitRow key={event.id} event={event} />)
        ) : (
          <Text style={styles.emptyText}>
            No commits that day. Start a focus session to plant a tree.
          </Text>
        )}
      </View>

      <SectionHeader title="Repos" />
      <View style={styles.card}>
        {repos.length > 0 ? (
          <View>
            <RepoBar repos={repos} />
            <View style={styles.repoList}>
              {repos.map((repo) => (
                <RepoRow key={repo.subjectId} repo={repo} />
              ))}
            </View>
          </View>
        ) : (
          <Text style={styles.emptyText}>Tag a session with a subject to see your repos.</Text>
        )}
      </View>

      <SectionHeader title="Achievements" />
      <Text style={styles.subhead}>{`${unlockedCount} of ${badges.length} unlocked`}</Text>
      <View style={styles.achievementGrid}>
        {badges.map((badge) => (
          <AchievementCard key={badge.id} item={badge} />
        ))}
      </View>

      <SectionHeader title="Recent commits" />
      <View style={styles.commitList}>
        {recent.map((event) => (
          <CommitRow key={event.id} event={event} />
        ))}
      </View>

      {hasDemo ? (
        <View style={styles.footer}>
          <Text style={styles.footerText}>Showing demo history from first launch.</Text>
          <Pressable onPress={confirmClear} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.startFresh}>Start fresh</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  pressed: { opacity: 0.82 },
  titleWrap: { marginLeft: 14 },
  eyebrow: { fontFamily: fonts.medium, fontSize: 10, letterSpacing: 1.8, color: colors.muted },
  title: { fontFamily: fonts.bold, fontSize: 25, lineHeight: 33, color: colors.ink, letterSpacing: -0.4 },
  subtitle: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.body, marginTop: 6 },

  levelCard: { borderRadius: radius.xl, padding: 20, marginTop: 18, overflow: 'hidden', ...shadow.card },
  levelEyebrow: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.55)' },
  levelTitle: { fontFamily: fonts.extra, fontSize: 24, color: colors.white, marginTop: 4, letterSpacing: -0.4 },
  levelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  levelXp: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  levelNext: { fontFamily: fonts.regular, fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  levelTrack: { height: 8, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', marginTop: 10 },
  levelFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.mint },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  statCard: { width: '48.5%', backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, ...shadow.card },
  statValue: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  statLabel: { fontFamily: fonts.medium, fontSize: 9.5, color: colors.muted, marginTop: 2 },

  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, ...shadow.card },
  caption: { fontFamily: fonts.regular, fontSize: 11, color: colors.body, marginTop: 10 },
  subhead: { fontFamily: fonts.regular, fontSize: 11, color: colors.body, marginTop: -6, marginBottom: 10 },
  emptyText: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.body, paddingVertical: 8, paddingHorizontal: 4 },

  dayCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12, marginTop: 12, gap: 8 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  dayTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  dayMeta: { fontFamily: fonts.medium, fontSize: 11, color: colors.mintDark },

  repoBar: { flexDirection: 'row', height: 10, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: colors.line },
  repoSegment: { height: '100%' },
  repoList: { marginTop: 14, gap: 12 },
  repoRow: { flexDirection: 'row', alignItems: 'center' },
  repoEmoji: { fontFamily: fonts.regular, fontSize: 18, width: 30 },
  repoBody: { flex: 1, marginLeft: 6 },
  repoName: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  repoMeta: { fontFamily: fonts.regular, fontSize: 10.5, color: colors.muted, marginTop: 2 },
  repoRight: { alignItems: 'flex-end' },
  repoXp: { fontFamily: fonts.semibold, fontSize: 12, color: colors.ink },
  repoShare: { fontFamily: fonts.medium, fontSize: 10, marginTop: 2 },

  achievementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  achievement: { width: '48.5%', borderRadius: radius.lg, borderWidth: 1, padding: 12 },
  achievementUnlocked: { backgroundColor: colors.white, borderColor: colors.mint, borderWidth: 1.5, ...shadow.card },
  achievementLocked: { backgroundColor: colors.surface, borderColor: colors.line },
  achievementTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  achievementEmoji: { fontFamily: fonts.regular, fontSize: 24 },
  dimmed: { opacity: 0.45 },
  achievementTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink, marginTop: 8 },
  achievementBody: { fontFamily: fonts.regular, fontSize: 10.5, lineHeight: 15, color: colors.body, marginTop: 2 },
  achievementTrack: { height: 5, borderRadius: radius.pill, backgroundColor: colors.line, overflow: 'hidden', marginTop: 10 },
  achievementFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.mint },
  achievementCount: { fontFamily: fonts.medium, fontSize: 10, color: colors.muted, marginTop: 6 },

  commitList: { gap: 8 },
  commit: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, paddingVertical: 10, paddingHorizontal: 12 },
  commitHash: { width: 56, fontFamily: fonts.medium, fontSize: 11, color: colors.mintDark },
  commitBody: { flex: 1, marginRight: 10 },
  commitMessage: { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 17, color: colors.ink },
  commitMeta: { fontFamily: fonts.regular, fontSize: 10, color: colors.muted, marginTop: 2 },
  xpChip: { backgroundColor: colors.mintSoft, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  xpChipText: { fontFamily: fonts.semibold, fontSize: 10, color: colors.mintDark },
  witheredChip: { backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  witheredText: { fontFamily: fonts.semibold, fontSize: 10, color: colors.body },

  footer: { alignItems: 'center', marginTop: 24, gap: 8 },
  footerText: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  startFresh: { fontFamily: fonts.semibold, fontSize: 12, color: colors.danger },
});
