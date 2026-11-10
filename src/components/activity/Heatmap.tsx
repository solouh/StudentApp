import { useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { formatDayLabel, type HeatCell } from '../../lib/activity/derive';
import { colors, fonts } from '../../theme';

/** Contribution scale, indexed by heat level 0..4 (see heatLevel in derive.ts). */
export const HEAT_COLORS = ['#EEF3F0', '#CDEFE1', '#8FE0C2', '#4CCB9E', '#1E9C75'] as const;

const WEEKDAYS: Partial<Record<number, string>> = { 0: 'Mon', 2: 'Wed', 4: 'Fri' };
const MONTH_ROW = 14;

export type HeatmapProps = {
  columns: HeatCell[][];
  months: { column: number; label: string }[];
  cell?: number;
  gap?: number;
  showWeekdays?: boolean;
  showLegend?: boolean;
  selectedKey?: string | null;
  onSelect?: (cell: HeatCell) => void;
};

/** GitHub-style contribution grid. Opens scrolled to the latest week. */
export function Heatmap({
  columns,
  months,
  cell = 12,
  gap = 3,
  showWeekdays = true,
  showLegend = true,
  selectedKey = null,
  onSelect,
}: HeatmapProps) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const step = cell + gap;

  return (
    <View>
      <View style={styles.body}>
        {showWeekdays ? (
          <View style={[styles.weekdays, { paddingTop: MONTH_ROW + 4, gap }]}>
            {Array.from({ length: 7 }, (_, row) => (
              <Text key={row} style={[styles.weekdayText, { height: cell, lineHeight: cell }]}>
                {WEEKDAYS[row] ?? ''}
              </Text>
            ))}
          </View>
        ) : null}

        <ScrollView
          ref={scrollRef}
          horizontal
          style={styles.scroll}
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          <View style={{ width: Math.max(0, columns.length * step - gap) }}>
            <View style={styles.monthRow}>
              {months.map((month) => (
                <Text
                  key={`${month.column}-${month.label}`}
                  numberOfLines={1}
                  style={[styles.monthText, { left: month.column * step }]}
                >
                  {month.label}
                </Text>
              ))}
            </View>
            <View style={[styles.grid, { gap }]}>
              {columns.map((column, index) => (
                <View key={index} style={{ width: cell, gap }}>
                  {column.map((item) => (
                    <HeatSquare
                      key={item.key}
                      item={item}
                      size={cell}
                      selected={item.key === selectedKey}
                      onSelect={onSelect}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>

      {showLegend ? (
        <View style={styles.legend}>
          <Text style={styles.legendText}>Less</Text>
          {HEAT_COLORS.map((color) => (
            <View key={color} style={[styles.swatch, { backgroundColor: color }]} />
          ))}
          <Text style={styles.legendText}>More</Text>
        </View>
      ) : null}
    </View>
  );
}

type SquareProps = { item: HeatCell; size: number; selected: boolean; onSelect?: (cell: HeatCell) => void };

function HeatSquare({ item, size, selected, onSelect }: SquareProps) {
  const style = [
    styles.square,
    { width: size, height: size, backgroundColor: HEAT_COLORS[item.level] },
    item.future && styles.future,
    item.isToday && styles.today,
    selected && styles.selected,
  ];

  if (item.future || !onSelect) return <View style={style} />;

  return (
    <Pressable
      onPress={() => onSelect(item)}
      style={style}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={`${formatDayLabel(item.date)}: ${item.xp} XP`}
      accessibilityState={{ selected }}
    />
  );
}

const styles = StyleSheet.create({
  body: { flexDirection: 'row' },
  weekdays: { width: 26, marginRight: 6 },
  weekdayText: { fontFamily: fonts.medium, fontSize: 9, color: colors.muted },
  scroll: { flex: 1 },
  monthRow: { height: MONTH_ROW, marginBottom: 4 },
  monthText: { position: 'absolute', top: 0, fontFamily: fonts.medium, fontSize: 9.5, lineHeight: MONTH_ROW, color: colors.muted },
  grid: { flexDirection: 'row' },
  square: { borderRadius: 3 },
  future: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
  today: { borderWidth: 1.5, borderColor: colors.ink },
  selected: { borderWidth: 2, borderColor: colors.mintDark },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 10 },
  legendText: { fontFamily: fonts.medium, fontSize: 9.5, color: colors.muted },
  swatch: { width: 10, height: 10, borderRadius: 3 },
});
