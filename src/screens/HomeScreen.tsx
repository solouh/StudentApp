import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heatmap } from '../components/activity/Heatmap';
import { HomeShortcuts, ShortcutPicker } from '../components/HomeShortcuts';
import { ClockIcon } from '../components/Icons';
import { Pill, SectionHeader } from '../components/ui';
import { useActivity } from '../lib/activity/ActivityContext';
import {
  buildHeatmap,
  currentStreak,
  formatDateHeading,
  levelFor,
  paperSummary,
  recentPapers,
  totalXp,
  xpInLastDays,
} from '../lib/activity/derive';
import type { ActivityEvent } from '../lib/activity/types';
import { getSubject } from '../lib/subjects';
import { STORAGE_PREFIX, usePersistentState } from '../lib/storage';
import {
  DEFAULT_SHORTCUT_IDS,
  MAX_HOME_SHORTCUTS,
  sanitizeShortcuts,
  toggleShortcut,
} from '../tools/shortcuts';
import { VISIBLE_READY_TOOL_IDS, VISIBLE_READY_TOOLS } from '../tools/registry';
import type { ReadyToolId } from '../tools/types';
import { colors, fonts, gradients, radius, shadow } from '../theme';

type Paper = {
  key: string;
  label: string;
  score: number;
  minutes: number;
  status: 'Completed' | 'In progress';
  accent: string;
  stats: { label: string; value: string }[];
};

const PAPER_ACCENTS = ['#7DE3BE', '#9FE8CB', '#F4C471'];

/** Maps a ledger paper event onto the card shape used below. */
function toPaper(event: ActivityEvent, index: number): Paper {
  const detail = event.detail ?? {};
  return {
    key: event.id,
    label: `${getSubject(event.subjectId)?.name ?? 'Past'} paper`,
    score: event.score ?? 0,
    minutes: event.minutes ?? 0,
    status: detail.status === 'In progress' ? 'In progress' : 'Completed',
    accent: PAPER_ACCENTS[index % PAPER_ACCENTS.length],
    stats: [
      { label: 'MCQ', value: String(detail.mcq ?? '—') },
      { label: 'Structured', value: String(detail.structured ?? '—') },
      { label: 'Essay', value: String(detail.essay ?? '—') },
    ],
  };
}

function PaperCard({ paper }: { paper: Paper }) {
  return (
    <LinearGradient
      colors={gradients.dark}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.paperCard}
    >
      <View style={styles.paperTop}>
        <Text style={styles.paperLabel}>{paper.label}</Text>
        <View style={styles.minutesChip}>
          <ClockIcon size={13} color={paper.accent} strokeWidth={2} />
          <Text style={[styles.minutesText, { color: paper.accent }]}>
            {paper.minutes} min
          </Text>
        </View>
      </View>

      <View style={styles.paperMid}>
        <Text style={styles.score}>{paper.score}%</Text>
        <Pill
          label={paper.status}
          tone={paper.status === 'Completed' ? 'mint' : 'light'}
        />
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${paper.score}%`, backgroundColor: paper.accent },
          ]}
        />
      </View>

      <View style={styles.statsRow}>
        {paper.stats.map((stat) => (
          <View key={stat.label} style={styles.statCol}>
            <Text style={styles.statLabel}>{stat.label.toUpperCase()}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

type Props = {
  onOpenActivity: () => void;
  onOpenTool: (toolId: ReadyToolId) => void;
};

export default function HomeScreen({ onOpenActivity, onOpenTool }: Props) {
  const insets = useSafeAreaInsets();
  const { events } = useActivity();
  const shortcuts = usePersistentState<string[]>(
    `${STORAGE_PREFIX}homeShortcuts`,
    DEFAULT_SHORTCUT_IDS,
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  const now = new Date();
  const streak = currentStreak(events, now);
  const weekXp = xpInLastDays(events, now, 7);
  const papers = paperSummary(events, now, 7);
  const level = levelFor(totalXp(events));
  const heat = buildHeatmap(events, now, 16);
  const latestPapers = recentPapers(events, 3).map(toPaper);

  // Saved ids can go stale (a tool may be closed), so always sanitise.
  const shortcutIds = sanitizeShortcuts(shortcuts.value, VISIBLE_READY_TOOL_IDS);
  const shortcutTools = shortcutIds
    .map((id) => VISIBLE_READY_TOOLS.find((tool) => tool.id === id))
    .filter((tool) => tool !== undefined);

  const toggleShortcutId = (id: ReadyToolId) => {
    shortcuts.setValue((previous) =>
      toggleShortcut(sanitizeShortcuts(previous, VISIBLE_READY_TOOL_IDS), id, MAX_HOME_SHORTCUTS),
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 130 },
        ]}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.date}>{formatDateHeading(now)}</Text>
            <Text style={styles.greeting}>Hey, Alex 👋</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AS</Text>
          </View>
        </View>

        <LinearGradient
          colors={gradients.mintDeep}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroBlobA} />
          <View style={styles.heroBlobB} />

          <Text style={styles.heroEyebrow}>WELCOME BACK</Text>
          <Text style={styles.heroTitle}>Welcome</Text>
          <Text style={styles.heroBody}>
            You earned {weekXp} XP this week. Keep the streak alive and finish
            strong.
          </Text>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{papers.completed}</Text>
              <Text style={styles.heroStatLabel}>Papers</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>
                {papers.average === null ? '—' : `${papers.average}%`}
              </Text>
              <Text style={styles.heroStatLabel}>Average</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{streak}d</Text>
              <Text style={styles.heroStatLabel}>Streak</Text>
            </View>
          </View>
        </LinearGradient>

        <HomeShortcuts
          tools={shortcutTools}
          onOpenTool={onOpenTool}
          onEdit={() => setPickerOpen(true)}
        />

        <View style={styles.activityCard}>
          <View style={styles.activityHeader}>
            <View style={styles.activityText}>
              <Text style={styles.activityTitle}>Level {level.level} · {level.title}</Text>
              <Text style={styles.activitySub}>
                {streak} day streak · {level.xpToNext} XP to next level
              </Text>
            </View>
            <Pressable
              onPress={onOpenActivity}
              style={({ pressed }) => [styles.activityButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Open full activity"
            >
              <Text style={styles.activityButtonText}>Activity</Text>
            </Pressable>
          </View>
          <View style={styles.activityGrid}>
            <Heatmap
              columns={heat.columns}
              months={heat.months}
              cell={11}
              gap={3}
              showWeekdays={false}
              showLegend={false}
            />
          </View>
        </View>

        <SectionHeader title="Your papers" action="See all" onPress={onOpenActivity} />

        {latestPapers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No past papers yet. Finish one and it appears here.
            </Text>
          </View>
        ) : (
          latestPapers.map((paper) => <PaperCard key={paper.key} paper={paper} />)
        )}
      </ScrollView>

      <ShortcutPicker
        visible={pickerOpen}
        tools={VISIBLE_READY_TOOLS}
        selected={shortcutIds}
        max={MAX_HOME_SHORTCUTS}
        onToggle={toggleShortcutId}
        onClose={() => setPickerOpen(false)}
      />
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
  pressed: {
    opacity: 0.88,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  date: {
    fontFamily: fonts.medium,
    fontSize: 10,
    letterSpacing: 1.8,
    color: colors.muted,
  },
  greeting: {
    fontFamily: fonts.bold,
    fontSize: 21,
    color: colors.ink,
    marginTop: 4,
    letterSpacing: -0.3,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.mintDark,
  },
  hero: {
    borderRadius: 26,
    padding: 20,
    overflow: 'hidden',
    ...shadow.card,
  },
  heroBlobA: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.20)',
    top: -60,
    right: -40,
  },
  heroBlobB: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.14)',
    bottom: -40,
    left: -24,
  },
  heroEyebrow: {
    fontFamily: fonts.semibold,
    fontSize: 9.5,
    letterSpacing: 2,
    color: 'rgba(14,26,21,0.45)',
  },
  heroTitle: {
    fontFamily: fonts.extra,
    fontSize: 26,
    color: colors.ink,
    marginTop: 4,
    letterSpacing: -0.4,
  },
  heroBody: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 19,
    color: 'rgba(14,26,21,0.68)',
    marginTop: 7,
    maxWidth: '86%',
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.34)',
    borderRadius: radius.md,
    paddingVertical: 11,
    marginTop: 16,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.ink,
  },
  heroStatLabel: {
    fontFamily: fonts.medium,
    fontSize: 9.5,
    color: 'rgba(14,26,21,0.55)',
    marginTop: 1,
  },
  heroDivider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    backgroundColor: 'rgba(14,26,21,0.18)',
  },
  activityCard: {
    marginTop: 16,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#F1F5F2',
    padding: 16,
    ...shadow.card,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityText: {
    flex: 1,
    marginRight: 10,
  },
  activityTitle: {
    fontFamily: fonts.semibold,
    fontSize: 13.5,
    color: colors.ink,
  },
  activitySub: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    color: colors.body,
    marginTop: 2,
  },
  activityButton: {
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  activityButtonText: {
    fontFamily: fonts.semibold,
    fontSize: 10.5,
    color: colors.white,
  },
  activityGrid: {
    marginTop: 14,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    marginBottom: 13,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.body,
  },
  paperCard: {
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: 13,
    ...shadow.card,
  },
  paperTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paperLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.2,
  },
  minutesChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  minutesText: {
    fontFamily: fonts.semibold,
    fontSize: 10,
  },
  paperMid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  score: {
    fontFamily: fonts.extra,
    fontSize: 38,
    color: colors.white,
    letterSpacing: -1,
    lineHeight: 44,
  },
  progressTrack: {
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    marginTop: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  statCol: {
    flex: 1,
  },
  statLabel: {
    fontFamily: fonts.medium,
    fontSize: 8.5,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.38)',
  },
  statValue: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 3,
  },
});
