import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { InlineNotice, PlannedToolRow, ToolScaffold } from '../components/tool-kit';
import { SectionHeader } from '../components/ui';
import { useBackHandler } from '../lib/useBackHandler';
import { colors, fonts, radius } from '../theme';
import {
  CLOSED_TOOLS,
  PHASE_LABELS,
  plannedToolCount,
  plannedToolsForPhase,
  VISIBLE_READY_TOOLS,
} from '../tools/registry';

type Props = { onBack: () => void };

const PHASES = [2, 3, 4] as const;

export default function RoadmapScreen({ onBack }: Props) {
  const total = VISIBLE_READY_TOOLS.length + plannedToolCount();

  useBackHandler(
    useCallback(() => {
      onBack();
      return true;
    }, [onBack]),
  );

  return (
    <ToolScaffold
      title="All tools"
      subtitle={`${VISIBLE_READY_TOOLS.length} ready · ${plannedToolCount()} planned`}
      onBack={onBack}
    >
      <InlineNotice
        message={`${total} student tools are planned. Everything below reuses the same offline print and study engine.`}
      />

      <SectionHeader title="Available now" />
      <View>
        {VISIBLE_READY_TOOLS.map((tool) => (
          <PlannedToolRow
            key={tool.id}
            name={tool.name}
            blurb={tool.blurb}
            Icon={tool.Icon}
            accent={tool.accent}
            phaseLabel="Ready"
          />
        ))}
      </View>

      {PHASES.map((phase) => {
        const tools = plannedToolsForPhase(phase);
        return (
          <View key={phase}>
            <SectionHeader title={PHASE_LABELS[phase]} />
            {tools.map((tool) => (
              <PlannedToolRow
                key={tool.id}
                name={tool.name}
                blurb={tool.blurb}
                Icon={tool.Icon}
                accent={tool.accent}
                phaseLabel={`P${phase}`}
              />
            ))}
          </View>
        );
      })}

      {CLOSED_TOOLS.length > 0 ? (
        <View>
          <SectionHeader title="Paused for now" />
          {CLOSED_TOOLS.map((tool) => (
            <PlannedToolRow
              key={tool.id}
              name={tool.name}
              blurb={tool.blurb}
              Icon={tool.Icon}
              accent={tool.accent}
              phaseLabel="Paused"
            />
          ))}
        </View>
      ) : null}

      <View style={styles.limitCard}>
        <Text style={styles.limitTitle}>Needs a custom build</Text>
        <Text style={styles.limitBody}>
          OCR note scanning, AI feedback, cloud sync, push notifications and
          silent direct printing are outside Expo Go. Everything else works
          offline on this phone.
        </Text>
      </View>
    </ToolScaffold>
  );
}

const styles = StyleSheet.create({
  limitCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  limitTitle: {
    fontFamily: fonts.semibold,
    fontSize: 12.5,
    color: colors.ink,
  },
  limitBody: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 17,
    color: colors.body,
    marginTop: 4,
  },
});
