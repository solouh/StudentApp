import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type AppStateStatus,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRightIcon, PauseIcon, PlayIcon } from '../components/Icons';
import { Tree } from '../components/activity/Tree';
import { ProgressRing, SectionHeader, Segmented } from '../components/ui';
import { useActivity } from '../lib/activity/ActivityContext';
import {
  focusStats,
  focusTrees,
  focusXp,
  formatMinutes,
  levelFor,
  totalXp,
} from '../lib/activity/derive';
import { getSubject, SUBJECTS } from '../lib/subjects';
import { colors, fonts, radius, shadow } from '../theme';

/* ------------------------------------------------------------------ */
/* Rules                                                               */
/* ------------------------------------------------------------------ */

const DURATIONS = [15, 25, 45, 50] as const;
type Duration = (typeof DURATIONS)[number];
const DEFAULT_DURATION: Duration = 25;

/** Leaving this screen or the app for longer than this withers the tree. */
const GRACE_MS = 10_000;
/** Minimum focused time before COMPLETE can plant anything. */
const MIN_COMPLETE_SEC = 60;

type Period = 'DAY' | 'WEEK' | 'MONTH';
const PERIOD_DAYS: Record<Period, number> = { DAY: 1, WEEK: 7, MONTH: 30 };
const PERIODS: Period[] = ['DAY', 'WEEK', 'MONTH'];

const AWAY_REASON = 'you were away for more than 10 seconds';

/* ------------------------------------------------------------------ */
/* Session state                                                       */
/* ------------------------------------------------------------------ */

type Outcome = 'grown' | 'withered' | 'short';

type SessionResult = {
  outcome: Outcome;
  minutes: number;
  xp: number;
  missionDone: boolean;
  /** New level title when this session levelled the student up, else null. */
  levelTitle: string | null;
  reason: string;
};

type Session = {
  status: 'idle' | 'running' | 'paused' | 'finished';
  subjectId: string;
  mission: string;
  totalSec: number;
  elapsedSec: number;
  /** Timestamp (ms) when the student left the screen or app, or null. */
  awayAt: number | null;
  escapes: number;
  result: SessionResult | null;
};

const IDLE_SESSION: Session = {
  status: 'idle',
  subjectId: SUBJECTS[0].id,
  mission: '',
  totalSec: DEFAULT_DURATION * 60,
  elapsedSec: 0,
  awayAt: null,
  escapes: 0,
  result: null,
};

function isLive(session: Session): boolean {
  return session.status === 'running' || session.status === 'paused';
}

function ringLabel(session: Session): string {
  switch (session.status) {
    case 'idle':
      return 'READY TO PLANT';
    case 'running':
      return session.awayAt !== null ? 'COME BACK!' : 'GROWING';
    case 'paused':
      return session.awayAt !== null ? 'COME BACK!' : 'PAUSED';
    case 'finished':
      if (session.result?.outcome === 'grown') return 'TREE PLANTED';
      if (session.result?.outcome === 'withered') return 'TREE WITHERED';
      return 'NOT PLANTED';
  }
}

function clock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

type Props = {
  /**
   * False while another tab, a tool or the Activity screen is on top. Leaving
   * while a session is live counts as an escape.
   */
  active: boolean;
  onOpenActivity: () => void;
};

export default function FocusScreen({ active, onOpenActivity }: Props) {
  const insets = useSafeAreaInsets();
  const { events, record } = useActivity();

  const [period, setPeriod] = useState<Period>('DAY');
  const [durationMin, setDurationMin] = useState<Duration>(DEFAULT_DURATION);
  const [subjectId, setSubjectId] = useState<string>(SUBJECTS[0].id);
  const [missionDraft, setMissionDraft] = useState('');
  const [session, setSession] = useState<Session>(IDLE_SESSION);
  const [appState, setAppState] = useState<AppStateStatus>(
    () => (AppState.currentState as AppStateStatus | null) ?? 'active',
  );

  // Refs let timers and the AppState listener read the newest session without
  // stale closures. `commit` keeps them in sync with every state change.
  const latest = useRef<Session>(IDLE_SESSION);
  const recordRef = useRef(record);
  const xpRef = useRef(totalXp(events));
  const awayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    recordRef.current = record;
    xpRef.current = totalXp(events);
  }, [record, events]);

  const commit = useCallback((next: Session) => {
    latest.current = next;
    setSession(next);
  }, []);

  const clearAway = useCallback(() => {
    if (awayTimer.current !== null) {
      clearTimeout(awayTimer.current);
      awayTimer.current = null;
    }
  }, []);

  /** Ends the live session. Grown sessions earn XP; withered ones are logged with 0 XP. */
  const finishSession = useCallback(
    (outcome: Exclude<Outcome, 'short'>, reason = '') => {
      const current = latest.current;
      if (!isLive(current)) return;
      clearAway();

      const minutes = Math.floor(current.elapsedSec / 60);
      if (minutes < 1) {
        // Too short to count: nothing is recorded.
        commit({
          ...current,
          status: 'finished',
          awayAt: null,
          result: {
            outcome: 'short',
            minutes: 0,
            xp: 0,
            missionDone: false,
            levelTitle: null,
            reason: 'Too short to count. Study for at least a minute next time.',
          },
        });
        return;
      }

      const subjectName = getSubject(current.subjectId)?.name ?? 'General';
      const missionDone = outcome === 'grown' && current.mission.length > 0;
      const xp = outcome === 'grown' ? focusXp(minutes, missionDone) : 0;
      const levelBefore = levelFor(xpRef.current).level;
      const levelAfter = levelFor(xpRef.current + xp);

      recordRef.current({
        kind: 'focus',
        subjectId: current.subjectId,
        message:
          outcome === 'grown'
            ? `Focused ${minutes} min · ${subjectName}${current.mission ? ` — ${current.mission}` : ''}`
            : `Tree withered at ${minutes} min · ${subjectName}`,
        xp,
        minutes,
        status: outcome,
        detail: {
          escapes: current.escapes,
          mission: missionDone ? 1 : 0,
          reason,
        },
      });

      commit({
        ...current,
        status: 'finished',
        awayAt: null,
        result: {
          outcome,
          minutes,
          xp,
          missionDone,
          levelTitle: levelAfter.level > levelBefore ? levelAfter.title : null,
          reason,
        },
      });
    },
    [clearAway, commit],
  );

  /** Student left the screen or the app: an escape, plus a grace timer. */
  const leaveSession = useCallback(() => {
    const current = latest.current;
    if (!isLive(current) || current.awayAt !== null) return;
    commit({ ...current, awayAt: Date.now(), escapes: current.escapes + 1 });
    clearAway();
    awayTimer.current = setTimeout(() => {
      awayTimer.current = null;
      finishSession('withered', AWAY_REASON);
    }, GRACE_MS);
  }, [clearAway, commit, finishSession]);

  /** Student is back. Within the grace period the session resumes; after it, the tree has withered. */
  const returnSession = useCallback(() => {
    const current = latest.current;
    if (current.awayAt === null) return;
    clearAway();
    if (Date.now() - current.awayAt > GRACE_MS) {
      finishSession('withered', AWAY_REASON);
      return;
    }
    commit({ ...current, awayAt: null });
  }, [clearAway, commit, finishSession]);

  // Presence = this screen is on top AND the app is in the foreground.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  const present = active && appState === 'active';
  useEffect(() => {
    if (present) {
      returnSession();
    } else {
      leaveSession();
    }
  }, [present, leaveSession, returnSession]);

  useEffect(() => () => clearAway(), [clearAway]);

  // The countdown. Each second adds focused time, unless the student is away.
  useEffect(() => {
    if (session.status !== 'running' || session.awayAt !== null) return undefined;
    const id = setInterval(() => {
      const current = latest.current;
      if (current.status !== 'running' || current.awayAt !== null) return;
      const elapsedSec = Math.min(current.totalSec, current.elapsedSec + 1);
      commit({ ...current, elapsedSec });
      if (elapsedSec >= current.totalSec) finishSession('grown');
    }, 1000);
    return () => clearInterval(id);
  }, [session.status, session.awayAt, commit, finishSession]);

  const startSession = () => {
    commit({
      status: 'running',
      subjectId,
      mission: missionDraft.trim(),
      totalSec: durationMin * 60,
      elapsedSec: 0,
      awayAt: null,
      escapes: 0,
      result: null,
    });
  };

  const togglePause = () => {
    const current = latest.current;
    if (current.status === 'running') commit({ ...current, status: 'paused' });
    if (current.status === 'paused') commit({ ...current, status: 'running' });
  };

  /* ---------------------------------------------------------------- */
  /* Derived values                                                    */
  /* ---------------------------------------------------------------- */

  const live = isLive(session);
  const awayNow = session.awayAt !== null;
  const now = new Date();
  const stats = focusStats(events, now, PERIOD_DAYS[period]);
  const trees = focusTrees(events, now, 7, 21);
  const level = levelFor(totalXp(events));

  const totalSec = session.status === 'idle' ? durationMin * 60 : session.totalSec;
  const remainingSec = Math.max(0, totalSec - session.elapsedSec);
  const ringProgress =
    session.status === 'idle' || totalSec === 0 ? 0 : session.elapsedSec / totalSec;
  const canComplete = live && session.elapsedSec >= MIN_COMPLETE_SEC;
  const weekGrown = trees.filter((tree) => tree.status !== 'withered').length;
  const weekWithered = trees.length - weekGrown;

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 140 },
        ]}
      >
        <Text style={styles.title}>Stay Focused!</Text>
        <Text style={styles.subtitle}>
          {live
            ? `Escapes ${session.escapes} · ${awayNow ? 'come back within 10 seconds' : 'stay on this screen to keep it growing'}`
            : 'Plant a tree by staying on this screen. Leave for more than 10 seconds and it withers.'}
        </Text>

        <Pressable
          onPress={onOpenActivity}
          style={({ pressed }) => [styles.levelStrip, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Open your activity"
        >
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>{level.level}</Text>
          </View>
          <View style={styles.levelBody}>
            <View style={styles.levelRow}>
              <Text style={styles.levelTitle}>{level.title}</Text>
              <Text style={styles.levelXp}>{level.total} XP</Text>
            </View>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${Math.round(level.progress * 100)}%` }]} />
            </View>
          </View>
          <ChevronRightIcon size={16} color={colors.muted} strokeWidth={2.2} />
        </Pressable>

        <View style={[styles.block, live && styles.dimmed]} pointerEvents={live ? 'none' : 'auto'}>
          <Segmented
            options={DURATIONS.map(String)}
            value={String(durationMin)}
            onChange={(next) => setDurationMin(Number(next) as Duration)}
            formatLabel={(option) => `${option} min`}
          />
        </View>

        <View style={[styles.block, live && styles.dimmed]} pointerEvents={live ? 'none' : 'auto'}>
          <View style={styles.chipRow}>
            {SUBJECTS.map((subject) => {
              const selected = subject.id === subjectId;
              return (
                <Pressable
                  key={subject.id}
                  onPress={() => setSubjectId(subject.id)}
                  style={[styles.chip, selected && styles.chipSelected]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Subject ${subject.name}`}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {subject.emoji} {subject.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.block}>
          <View style={styles.missionRow}>
            <Text style={styles.missionLabel}>MISSION</Text>
            <Text style={styles.missionHint}>+10 XP when you finish it</Text>
          </View>
          <TextInput
            value={missionDraft}
            onChangeText={setMissionDraft}
            editable={!live}
            maxLength={60}
            placeholder="e.g. finish 10 MCQs on cell division"
            placeholderTextColor={colors.muted}
            style={[styles.missionInput, live && styles.dimmed]}
            accessibilityLabel="Session mission"
          />
        </View>

        <View style={styles.ringWrap}>
          <ProgressRing size={214} stroke={13} progress={ringProgress}>
            {session.status === 'finished' ? (
              <Text style={styles.resultEmoji}>
                {session.result?.outcome === 'grown' ? '🌳' : session.result?.outcome === 'withered' ? '🥀' : '⏱️'}
              </Text>
            ) : (
              <Text style={styles.timer}>{clock(remainingSec)}</Text>
            )}
            <Text style={styles.timerLabel}>{ringLabel(session)}</Text>
          </ProgressRing>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => finishSession('grown')}
            disabled={!canComplete}
            style={({ pressed }) => [
              styles.actionLight,
              !canComplete && styles.disabled,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Complete session"
          >
            <Text style={styles.actionLightText}>COMPLETE</Text>
          </Pressable>

          <Pressable
            onPress={live ? togglePause : startSession}
            style={({ pressed }) => [styles.actionDark, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={session.status === 'running' ? 'Pause session' : live ? 'Resume session' : 'Start session'}
          >
            {session.status === 'running' ? (
              <PauseIcon size={15} color={colors.white} />
            ) : (
              <PlayIcon size={15} color={colors.white} />
            )}
            <Text style={styles.actionDarkText}>
              {session.status === 'running' ? 'PAUSE' : live ? 'RESUME' : 'START'}
            </Text>
          </Pressable>
        </View>

        {live ? (
          <Pressable
            onPress={() => finishSession('withered', 'you gave up')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Give up this session"
          >
            <Text style={styles.giveUp}>Give up · the tree withers</Text>
          </Pressable>
        ) : null}

        {session.status === 'finished' && session.result ? (
          <View
            style={[
              styles.resultCard,
              session.result.outcome === 'grown' ? styles.resultGrown : styles.resultMuted,
            ]}
          >
            <Text style={styles.resultTitle}>
              {session.result.outcome === 'grown'
                ? 'Tree planted'
                : session.result.outcome === 'withered'
                  ? 'Tree withered'
                  : 'Not planted'}
            </Text>
            <Text style={styles.resultBody}>
              {session.result.outcome === 'grown'
                ? `+${session.result.xp} XP · ${session.result.minutes} min focused${session.result.missionDone ? ' · mission complete' : ''}`
                : session.result.reason}
            </Text>
            {session.result.levelTitle ? (
              <Text style={styles.levelUp}>Level up! You are now a {session.result.levelTitle}.</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.forestCard}>
          <View style={styles.forestHeader}>
            <Text style={styles.forestTitle}>Your forest</Text>
            <Text style={styles.forestMeta}>Last 7 days</Text>
          </View>
          {trees.length === 0 && !live ? (
            <Text style={styles.forestEmpty}>No trees yet. Plant your first one above.</Text>
          ) : (
            <View style={styles.forestGrid}>
              {trees.map((tree) => (
                <Tree
                  key={tree.id}
                  size={30}
                  color={getSubject(tree.subjectId)?.tint.fg ?? colors.mintDeep}
                  withered={tree.status === 'withered'}
                />
              ))}
              {live ? (
                <Tree
                  size={30}
                  color={getSubject(session.subjectId)?.tint.fg ?? colors.mintDeep}
                  growth={ringProgress}
                />
              ) : null}
            </View>
          )}
          <Text style={styles.forestFooter}>
            {weekGrown} grown · {weekWithered} withered
          </Text>
        </View>

        <View style={styles.statsBlock}>
          <SectionHeader title="Statistics" action="Activity" onPress={onOpenActivity} />

          <Segmented options={PERIODS} value={period} onChange={setPeriod} />

          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statsCol}>
                <Text style={styles.statsValue}>{formatMinutes(stats.focusedMinutes)}</Text>
                <Text style={styles.statsLabel}>Focused</Text>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsCol}>
                <Text style={styles.statsValue}>{stats.sessions}</Text>
                <Text style={styles.statsLabel}>Sessions</Text>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsCol}>
                <Text style={styles.statsValue}>
                  {stats.completion === null ? '—' : `${stats.completion}%`}
                </Text>
                <Text style={styles.statsLabel}>Completion</Text>
              </View>
            </View>
          </View>
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
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 320,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.4,
  },
  dimmed: {
    opacity: 0.5,
  },
  block: {
    width: '100%',
    marginTop: 14,
  },
  levelStrip: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
  },
  levelBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeText: {
    fontFamily: fonts.extra,
    fontSize: 15,
    color: colors.ink,
  },
  levelBody: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  levelTitle: {
    fontFamily: fonts.semibold,
    fontSize: 12.5,
    color: colors.ink,
  },
  levelXp: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    color: colors.muted,
  },
  xpTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.line,
    overflow: 'hidden',
    marginTop: 7,
  },
  xpFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.mintDeep,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  chipSelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  chipText: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: colors.inkSoft,
  },
  chipTextSelected: {
    color: colors.white,
  },
  missionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  missionLabel: {
    fontFamily: fonts.semibold,
    fontSize: 9.5,
    letterSpacing: 1.6,
    color: colors.muted,
  },
  missionHint: {
    fontFamily: fonts.medium,
    fontSize: 9.5,
    color: colors.mintDark,
  },
  missionInput: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  ringWrap: {
    marginTop: 22,
    ...shadow.card,
    borderRadius: 999,
    backgroundColor: colors.white,
  },
  timer: {
    fontFamily: fonts.extra,
    fontSize: 42,
    color: colors.ink,
    letterSpacing: -1.6,
  },
  timerLabel: {
    fontFamily: fonts.semibold,
    fontSize: 8.5,
    letterSpacing: 1.8,
    color: colors.muted,
    marginTop: 2,
  },
  resultEmoji: {
    fontSize: 56,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  actionLight: {
    flex: 1,
    backgroundColor: colors.mintSoft,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLightText: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    letterSpacing: 0.6,
    color: colors.mintDark,
  },
  actionDark: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDarkText: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    letterSpacing: 0.6,
    color: colors.white,
  },
  giveUp: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
    marginTop: 14,
    textDecorationLine: 'underline',
  },
  resultCard: {
    width: '100%',
    marginTop: 18,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
  },
  resultGrown: {
    backgroundColor: colors.mintMist,
    borderColor: '#D7F2E6',
  },
  resultMuted: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
  },
  resultTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.ink,
  },
  resultBody: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.body,
    marginTop: 4,
  },
  levelUp: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: colors.mintDark,
    marginTop: 8,
  },
  forestCard: {
    width: '100%',
    marginTop: 22,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#F1F5F2',
    padding: 16,
    ...shadow.card,
  },
  forestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forestTitle: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.ink,
  },
  forestMeta: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.muted,
  },
  forestGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    minHeight: 34,
  },
  forestEmpty: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: colors.body,
    marginTop: 12,
  },
  forestFooter: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.muted,
    marginTop: 12,
  },
  statsBlock: {
    width: '100%',
    marginTop: 8,
  },
  statsCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#F1F5F2',
    paddingVertical: 18,
    marginTop: 12,
    ...shadow.card,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsCol: {
    flex: 1,
    alignItems: 'center',
  },
  statsValue: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.ink,
  },
  statsLabel: {
    fontFamily: fonts.medium,
    fontSize: 9.5,
    color: colors.muted,
    marginTop: 2,
  },
  statsDivider: {
    width: StyleSheet.hairlineWidth,
    height: 26,
    backgroundColor: colors.line,
  },
});
