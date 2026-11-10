import { useMemo, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowUpRightIcon,
  CloseIcon,
  InfoIcon,
  SearchIcon,
  SparkleIcon,
} from '../components/Icons';
import { PlannedToolRow, ToolTile } from '../components/tool-kit';
import { SectionHeader } from '../components/ui';
import { colors, fonts, gradients, radius, shadow } from '../theme';
import {
  CATEGORIES,
  filterReadyTools,
  plannedToolCount,
  plannedToolsForPhase,
  VISIBLE_READY_TOOLS,
} from '../tools/registry';
import type { ReadyToolId } from '../tools/types';
import type { ToolCategory } from '../tools/types';

type Props = {
  onOpenTool: (toolId: ReadyToolId) => void;
  onOpenRoadmap: () => void;
};

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}

export default function ToolsScreen({ onOpenTool, onOpenRoadmap }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | ToolCategory>('all');

  const readyTools = useMemo(() => filterReadyTools(query, category), [query, category]);
  const comingNext = useMemo(() => plannedToolsForPhase(2).slice(0, 3), []);
  const totalTools = VISIBLE_READY_TOOLS.length + plannedToolCount();
  const isSearching = query.trim().length > 0;

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 132,
        }}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.eyebrow}>STUDENT TOOLBOX</Text>
          <Text style={styles.title}>Make something</Text>
          <Text style={styles.subtitle}>
            Print-ready sheets, study helpers and quick utilities — all offline,
            all on your phone.
          </Text>
        </View>

        <View style={styles.searchWrap}>
          <SearchIcon size={17} color={colors.muted} strokeWidth={2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search tools"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            returnKeyType="search"
            accessibilityLabel="Search tools"
          />
          {isSearching ? (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <CloseIcon size={15} color={colors.muted} strokeWidth={2.4} />
            </Pressable>
          ) : null}
        </View>

        {!isSearching ? (
          <LinearGradient
            colors={gradients.mintDeep}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.feature}
          >
            <View style={styles.featureBlobA} />
            <View style={styles.featureBlobB} />

            <View style={styles.featureTop}>
              <View style={styles.featurePill}>
                <SparkleIcon size={11} color={colors.ink} strokeWidth={2} />
                <Text style={styles.featurePillText}>NEW · PRINT STUDIO</Text>
              </View>
              <Text style={styles.featureMeta}>3 print tools</Text>
            </View>

            <Text style={styles.featureTitle}>Collage, cut{'\n'}& print</Text>
            <Text style={styles.featureBody}>
              Grid your photos, slice them into poster tiles, then print or send
              them in two taps.
            </Text>

            <Pressable
              onPress={() => onOpenTool('collage')}
              accessibilityRole="button"
              accessibilityLabel="Start a collage"
              style={({ pressed }) => [styles.featureCta, pressed && styles.pressed]}
            >
              <Text style={styles.featureCtaText}>START A COLLAGE</Text>
              <ArrowUpRightIcon size={14} color={colors.ink} strokeWidth={2.2} />
            </Pressable>
          </LinearGradient>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {CATEGORIES.map((item) => {
            const active = item.id === category;
            return (
              <Pressable
                key={item.id}
                onPress={() => setCategory(item.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={item.label}
                style={({ pressed }) => [
                  styles.chip,
                  active && styles.chipActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.sectionWrap}>
          <SectionHeader
            title={isSearching ? `${readyTools.length} result${readyTools.length === 1 ? '' : 's'}` : 'Ready now'}
            action="All tools"
            onPress={onOpenRoadmap}
          />
        </View>

        {readyTools.length === 0 ? (
          <View style={styles.noResults}>
            <Text style={styles.noResultsTitle}>No tools match that search</Text>
            <Text style={styles.noResultsBody}>
              Try “print”, “quiz”, “formula”, “photo” or clear the search.
            </Text>
          </View>
        ) : (
          chunk(readyTools, 2).map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.gridRow}>
              {row.map((tool) => (
                <ToolTile
                  key={tool.id}
                  name={tool.name}
                  blurb={tool.blurb}
                  Icon={tool.Icon}
                  accent={tool.accent}
                  badge={tool.id === 'mcq' || tool.id === 'formula' ? 'NEW' : undefined}
                  onPress={() => onOpenTool(tool.id)}
                />
              ))}
              {row.length === 1 ? <View style={styles.gridSpacer} /> : null}
            </View>
          ))
        )}

        {!isSearching ? (
          <>
            <View style={styles.sectionWrap}>
              <SectionHeader title="Coming next" action="Roadmap" onPress={onOpenRoadmap} />
            </View>
            <View style={styles.rows}>
              {comingNext.map((tool) => (
                <PlannedToolRow
                  key={tool.id}
                  name={tool.name}
                  blurb={tool.blurb}
                  Icon={tool.Icon}
                  accent={tool.accent}
                  phaseLabel="Soon"
                />
              ))}
            </View>

            <Pressable
              onPress={onOpenRoadmap}
              accessibilityRole="button"
              accessibilityLabel={`See all ${totalTools} tools`}
              style={({ pressed }) => [styles.allTools, pressed && styles.pressed]}
            >
              <Text style={styles.allToolsText}>
                See all {totalTools} tools
              </Text>
            </Pressable>
          </>
        ) : null}

        <View style={styles.privacyNote}>
          <InfoIcon size={15} color={colors.mintDark} strokeWidth={1.9} />
          <Text style={styles.privacyText}>
            Photos, quiz answers and pinned formulas stay on your phone. Nothing
            is uploaded.
          </Text>
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
  headerBlock: {
    paddingHorizontal: 20,
  },
  eyebrow: {
    fontFamily: fonts.semibold,
    fontSize: 9.5,
    letterSpacing: 2,
    color: colors.muted,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 25,
    lineHeight: 33,
    color: colors.ink,
    letterSpacing: -0.4,
    marginTop: 4,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.body,
    marginTop: 6,
    maxWidth: '92%',
  },
  searchWrap: {
    marginHorizontal: 20,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    padding: 0,
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.ink,
  },
  feature: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 26,
    padding: 18,
    overflow: 'hidden',
    ...shadow.card,
  },
  featureBlobA: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.20)',
    top: -58,
    right: -36,
  },
  featureBlobB: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.14)',
    bottom: -34,
    left: -22,
  },
  featureTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.42)',
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  featurePillText: {
    fontFamily: fonts.bold,
    fontSize: 8,
    letterSpacing: 1.2,
    color: colors.ink,
  },
  featureMeta: {
    fontFamily: fonts.semibold,
    fontSize: 9.5,
    color: 'rgba(14,26,21,0.55)',
  },
  featureTitle: {
    fontFamily: fonts.extra,
    fontSize: 24,
    lineHeight: 29,
    letterSpacing: -0.5,
    color: colors.ink,
    marginTop: 12,
  },
  featureBody: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    lineHeight: 18,
    color: 'rgba(14,26,21,0.68)',
    marginTop: 6,
    maxWidth: '88%',
  },
  featureCta: {
    marginTop: 14,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  featureCtaText: {
    fontFamily: fonts.bold,
    fontSize: 9.5,
    letterSpacing: 0.9,
    color: colors.ink,
  },
  pressed: {
    opacity: 0.88,
  },
  chipsRow: {
    paddingHorizontal: 20,
    gap: 8,
    paddingTop: 18,
    paddingBottom: 2,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: '#EEF2EF',
    backgroundColor: colors.white,
  },
  chipActive: {
    borderColor: colors.mint,
    backgroundColor: colors.mintMist,
  },
  chipLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.body,
  },
  chipLabelActive: {
    color: colors.mintDark,
  },
  sectionWrap: {
    paddingHorizontal: 20,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  gridSpacer: {
    flex: 1,
  },
  noResults: {
    marginHorizontal: 20,
    marginTop: 6,
    padding: 20,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  noResultsTitle: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.ink,
  },
  noResultsBody: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.body,
    marginTop: 4,
  },
  rows: {
    paddingHorizontal: 20,
  },
  allTools: {
    marginHorizontal: 20,
    marginTop: 2,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  allToolsText: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: colors.body,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginHorizontal: 20,
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.mintMist,
  },
  privacyText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 10,
    lineHeight: 15,
    color: colors.mintDark,
  },
});
