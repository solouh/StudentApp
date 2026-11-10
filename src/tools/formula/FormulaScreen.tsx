/**
 * Formula Sheet: the formulas a student writes themselves.
 *
 * Everything is stored on the phone. Formulas are grouped per subject, can be
 * searched, pinned and edited, and the bundled sheet is only an optional
 * one-tap import so the list can start empty.
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BookIcon,
  CloseIcon,
  PlusIcon,
  SearchIcon,
  SparkleIcon,
  StarIcon,
  TrashIcon,
} from '../../components/Icons';
import {
  EmptyState,
  InlineNotice,
  OptionChip,
  SectionLabel,
  TextField,
  ToolButton,
  ToolScaffold,
} from '../../components/tool-kit';
import { useActivity } from '../../lib/activity/ActivityContext';
import { SUBJECTS } from '../../lib/subjects';
import { STORAGE_PREFIX, usePersistentState } from '../../lib/storage';
import { useBackHandler } from '../../lib/useBackHandler';
import { colors, fonts, radius, shadow } from '../../theme';
import {
  ALL_SUBJECT_KEY,
  countBySubject,
  createFormula,
  emptyDraft,
  groupBySubject,
  isFormulaValid,
  mergeStarter,
  pinnedFormulas,
  removeFormula,
  searchFormulas,
  togglePin,
  toDraft,
  updateFormula,
  validateFormula,
  type FormulaDraft,
  type MyFormula,
} from './model';
import { STARTER_FORMULAS } from './sheets';

type SubjectLook = { name: string; emoji: string; tint: { bg: string; fg: string } };
type Notice = { tone: 'success' | 'error'; message: string };

const FALLBACK_SUBJECT: SubjectLook = {
  name: 'Other subject',
  emoji: '📐',
  tint: { bg: colors.mintSoft, fg: colors.mintDark },
};

const SUBJECT_BY_ID = new Map(SUBJECTS.map((subject) => [subject.id, subject] as const));

function subjectOf(subjectId: string): SubjectLook {
  const subject = SUBJECT_BY_ID.get(subjectId);
  if (!subject) return FALLBACK_SUBJECT;
  return { name: subject.name, emoji: subject.emoji, tint: subject.tint };
}

/* ---------------------------------------------------------------- */
/* Small pieces                                                      */
/* ---------------------------------------------------------------- */

function SubjectChip({ subjectId }: { subjectId: string }) {
  const subject = subjectOf(subjectId);
  return (
    <View style={[styles.subjectChip, { backgroundColor: subject.tint.bg }]}>
      <Text style={styles.subjectEmoji}>{subject.emoji}</Text>
      <Text style={[styles.subjectChipLabel, { color: subject.tint.fg }]} numberOfLines={1}>
        {subject.name}
      </Text>
    </View>
  );
}

function ActionPill({
  label,
  accessibilityLabel,
  icon,
  selected,
  active = false,
  danger = false,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  icon?: ReactNode;
  selected?: boolean;
  active?: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={selected === undefined ? undefined : { selected }}
      style={({ pressed }) => [
        styles.actionPill,
        active && styles.actionPillActive,
        pressed && styles.pressed,
      ]}
    >
      {icon}
      <Text
        style={[
          styles.actionLabel,
          active && styles.actionLabelActive,
          danger && styles.actionLabelDanger,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function FormulaCard({
  formula,
  pinned,
  onOpen,
  onTogglePin,
  onDelete,
}: {
  formula: MyFormula;
  pinned: boolean;
  onOpen: (formula: MyFormula) => void;
  onTogglePin: (formula: MyFormula) => void;
  onDelete: (formula: MyFormula) => void;
}) {
  return (
    <Pressable
      onPress={() => onOpen(formula)}
      accessibilityRole="button"
      accessibilityLabel={`${formula.name}, ${subjectOf(formula.subjectId).name}. Open to edit.`}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <SubjectChip subjectId={formula.subjectId} />

      <Text style={styles.name}>{formula.name}</Text>

      <View style={styles.expressionPanel}>
        <Text style={styles.expression}>{formula.expression}</Text>
      </View>

      {formula.note ? <Text style={styles.note}>{formula.note}</Text> : null}

      <View style={styles.cardActions}>
        <ActionPill
          label={pinned ? 'Pinned' : 'Pin'}
          accessibilityLabel={pinned ? `Unpin ${formula.name}` : `Pin ${formula.name}`}
          selected={pinned}
          active={pinned}
          icon={
            <StarIcon size={12} color={pinned ? colors.mintDark : colors.body} strokeWidth={2.2} />
          }
          onPress={() => onTogglePin(formula)}
        />
        <ActionPill
          label="Edit"
          accessibilityLabel={`Edit ${formula.name}`}
          onPress={() => onOpen(formula)}
        />
        <ActionPill
          label="Delete"
          accessibilityLabel={`Delete ${formula.name}`}
          danger
          icon={<TrashIcon size={12} color={colors.danger} strokeWidth={2} />}
          onPress={() => onDelete(formula)}
        />
      </View>
    </Pressable>
  );
}

function PinnedRow({
  formula,
  first,
  onOpen,
}: {
  formula: MyFormula;
  first: boolean;
  onOpen: (formula: MyFormula) => void;
}) {
  return (
    <Pressable
      onPress={() => onOpen(formula)}
      accessibilityRole="button"
      accessibilityLabel={`${formula.name}: ${formula.expression}. Open to edit.`}
      style={({ pressed }) => [
        styles.pinnedRow,
        !first && styles.pinnedRowDivider,
        pressed && styles.pressed,
      ]}
    >
      <StarIcon size={13} color={colors.mintDark} strokeWidth={2} />
      <View style={styles.pinnedBody}>
        <Text style={styles.pinnedName} numberOfLines={1}>
          {formula.name}
        </Text>
        <Text style={styles.pinnedExpression} numberOfLines={1}>
          {formula.expression}
        </Text>
      </View>
    </Pressable>
  );
}

function SubjectGroupHeader({ subjectId, count }: { subjectId: string; count: number }) {
  const subject = subjectOf(subjectId);
  return (
    <View style={styles.groupHeader}>
      <Text style={styles.groupEmoji}>{subject.emoji}</Text>
      <Text style={styles.groupName}>{subject.name}</Text>
      <Text style={styles.groupCount}>{count}</Text>
    </View>
  );
}

/** No results: either the search or the subject filter emptied the list. */
function EmptyHint({
  trimmedQuery,
  onAdd,
  onClearSearch,
}: {
  trimmedQuery: string;
  onAdd: () => void;
  onClearSearch: () => void;
}) {
  if (trimmedQuery) {
    return (
      <EmptyState
        title="Nothing matches"
        body={`No formula matches “${trimmedQuery}”. Try a shorter word, or clear the search.`}
        actionLabel="Clear search"
        onAction={onClearSearch}
        icon={<SearchIcon size={26} color={colors.mintDark} />}
      />
    );
  }

  return (
    <EmptyState
      title="Nothing in this subject"
      body="Add a formula for this subject, or switch the filter back to All."
      actionLabel="Add a formula"
      onAction={onAdd}
      icon={<BookIcon size={26} color={colors.mintDark} />}
    />
  );
}

/* ---------------------------------------------------------------- */
/* Add / edit form                                                   */
/* ---------------------------------------------------------------- */

type FormulaFormProps = {
  visible: boolean;
  editing: MyFormula | null;
  defaultSubjectId: string;
  onClose: () => void;
  onSave: (draft: FormulaDraft) => void;
};

/**
 * Bottom-sheet form. Its body only mounts while the sheet is open, so every
 * open starts from a fresh draft instead of the previous session's text.
 */
function FormulaForm({
  visible,
  editing,
  defaultSubjectId,
  onClose,
  onSave,
}: FormulaFormProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {visible ? (
        <FormulaFormBody
          editing={editing}
          defaultSubjectId={defaultSubjectId}
          onClose={onClose}
          onSave={onSave}
        />
      ) : null}
    </Modal>
  );
}

function FormulaFormBody({
  editing,
  defaultSubjectId,
  onClose,
  onSave,
}: Omit<FormulaFormProps, 'visible'>) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<FormulaDraft>(() =>
    editing ? toDraft(editing) : emptyDraft(defaultSubjectId),
  );
  const [attempted, setAttempted] = useState(false);

  const errors = validateFormula(draft);

  const patch = useCallback((next: Partial<FormulaDraft>) => {
    setDraft((previous) => ({ ...previous, ...next }));
  }, []);

  const submit = useCallback(() => {
    setAttempted(true);
    if (!isFormulaValid(draft)) return;
    onSave(draft);
  }, [draft, onSave]);

  return (
    <View style={styles.formBackdrop}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close formula form"
      />

      <View style={[styles.formSheet, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <View style={styles.grabber} />

        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>{editing ? 'Edit formula' : 'Add formula'}</Text>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close formula form"
            style={({ pressed }) => [styles.formClose, pressed && styles.pressed]}
          >
            <CloseIcon size={15} color={colors.body} strokeWidth={2.4} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.formScroll}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.plainField}>
            <Text style={styles.formLabel}>SUBJECT</Text>
            <View style={styles.formChipRow}>
              {SUBJECTS.map((subject) => (
                <OptionChip
                  key={subject.id}
                  label={`${subject.emoji} ${subject.name}`}
                  active={subject.id === draft.subjectId}
                  onPress={() => patch({ subjectId: subject.id })}
                />
              ))}
            </View>
          </View>

          <TextField
            label="Name"
            value={draft.name}
            onChangeText={(name) => patch({ name })}
            placeholder="e.g. Ohm’s law"
            maxLength={48}
          />
          {attempted && errors.name ? <Text style={styles.error}>{errors.name}</Text> : null}

          <View style={styles.plainField}>
            <Text style={styles.formLabel}>FORMULA</Text>
            <TextInput
              value={draft.expression}
              onChangeText={(expression) => patch({ expression })}
              placeholder="e.g. V = IR"
              placeholderTextColor={colors.muted}
              style={[styles.fieldInput, styles.formulaInput]}
              multiline
              maxLength={120}
              accessibilityLabel="Formula"
            />
          </View>
          {attempted && errors.expression ? (
            <Text style={styles.error}>{errors.expression}</Text>
          ) : null}

          <TextField
            label="Note"
            value={draft.note}
            onChangeText={(note) => patch({ note })}
            placeholder="Optional — when to use it"
            maxLength={160}
          />
        </ScrollView>

        <View style={styles.formActions}>
          <ToolButton label="Cancel" tone="outline" onPress={onClose} style={styles.formButton} />
          <ToolButton label="Save" tone="dark" onPress={submit} style={styles.formButton} />
        </View>
      </View>
    </View>
  );
}

/* ---------------------------------------------------------------- */
/* Screen                                                            */
/* ---------------------------------------------------------------- */

export default function FormulaScreen({ onClose }: { onClose: () => void }) {
  const { record } = useActivity();
  const formulas = usePersistentState<MyFormula[]>(`${STORAGE_PREFIX}myFormulas`, []);
  const pins = usePersistentState<string[]>(`${STORAGE_PREFIX}formulaPins`, []);

  const [query, setQuery] = useState('');
  const [subjectId, setSubjectId] = useState<string>(ALL_SUBJECT_KEY);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MyFormula | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  useBackHandler(
    useCallback(() => {
      onClose();
      return true;
    }, [onClose]),
  );

  const setFormulas = formulas.setValue;
  const setPins = pins.setValue;

  const counts = useMemo(() => countBySubject(formulas.value), [formulas.value]);
  const pinned = useMemo(
    () => pinnedFormulas(formulas.value, pins.value),
    [formulas.value, pins.value],
  );
  const pinnedIds = useMemo(() => new Set(pins.value), [pins.value]);
  const results = useMemo(
    () => searchFormulas(formulas.value, query, subjectId),
    [formulas.value, query, subjectId],
  );
  const groups = useMemo(() => groupBySubject(results), [results]);
  const trimmedQuery = query.trim();
  const defaultSubjectId = subjectId === ALL_SUBJECT_KEY ? SUBJECTS[0].id : subjectId;

  const openAdd = useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((formula: MyFormula) => {
    setEditing(formula);
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
  }, []);

  const togglePinned = useCallback(
    (formula: MyFormula) => {
      setPins((previous) => togglePin(previous, formula.id));
    },
    [setPins],
  );

  const saveFormula = useCallback(
    (draft: FormulaDraft) => {
      if (editing) {
        setFormulas((previous) => updateFormula(previous, editing.id, draft));
        setNotice({ tone: 'success', message: 'Formula updated' });
      } else {
        const formula = createFormula(draft);
        setFormulas((previous) => [...previous, formula]);
        // 8 XP once per subject per day; the ledger de-dupes the key.
        record({
          kind: 'formula',
          subjectId: draft.subjectId,
          message: `Added ${formula.name} · ${subjectOf(draft.subjectId).name}`,
          xp: 8,
          dedupeKey: `formula:${draft.subjectId}`,
        });
        setNotice({ tone: 'success', message: 'Formula added' });
      }
      setFormOpen(false);
      setEditing(null);
    },
    [editing, record, setFormulas],
  );

  const deleteFormula = useCallback(
    (formula: MyFormula) => {
      Alert.alert('Delete formula?', formula.name, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setFormulas((previous) => removeFormula(previous, formula.id));
            setPins((previous) => previous.filter((id) => id !== formula.id));
            setNotice({ tone: 'success', message: 'Formula deleted' });
          },
        },
      ]);
    },
    [setFormulas, setPins],
  );

  const loadStarter = useCallback(() => {
    setFormulas((previous) => mergeStarter(previous, STARTER_FORMULAS));
    setNotice({ tone: 'success', message: 'Starter formulas added' });
  }, [setFormulas]);

  const renderCard = (formula: MyFormula) => (
    <FormulaCard
      key={formula.id}
      formula={formula}
      pinned={pinnedIds.has(formula.id)}
      onOpen={openEdit}
      onTogglePin={togglePinned}
      onDelete={deleteFormula}
    />
  );

  return (
    <>
      <ToolScaffold
        title="Formula Sheet"
        subtitle={
          formulas.hydrated
            ? `${formulas.value.length} of your formulas`
            : 'Loading your formulas'
        }
        onBack={onClose}
        footer={
          formulas.hydrated ? (
            <ToolButton
              label="Add a formula"
              tone="dark"
              onPress={openAdd}
              icon={<PlusIcon size={15} color={colors.white} strokeWidth={2.4} />}
            />
          ) : undefined
        }
      >
        {!formulas.hydrated ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.mintDeep} />
            <Text style={styles.loadingText}>Loading your formulas…</Text>
          </View>
        ) : (
          <>
            <View style={styles.searchWrap}>
              <SearchIcon size={17} color={colors.muted} strokeWidth={2} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search your formulas"
                placeholderTextColor={colors.muted}
                style={styles.searchInput}
                returnKeyType="search"
                autoCorrect={false}
                accessibilityLabel="Search formulas"
              />
              {query ? (
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

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.chipRow}
              style={styles.chipScroll}
            >
              <OptionChip
                label="All"
                active={subjectId === ALL_SUBJECT_KEY}
                onPress={() => setSubjectId(ALL_SUBJECT_KEY)}
              />
              {SUBJECTS.map((subject) => {
                const count = counts[subject.id] ?? 0;
                const label =
                  count > 0
                    ? `${subject.emoji} ${subject.name} ${count}`
                    : `${subject.emoji} ${subject.name}`;
                return (
                  <OptionChip
                    key={subject.id}
                    label={label}
                    active={subjectId === subject.id}
                    onPress={() => setSubjectId(subject.id)}
                  />
                );
              })}
            </ScrollView>

            {notice ? <InlineNotice tone={notice.tone} message={notice.message} /> : null}

            {formulas.value.length === 0 ? (
              <>
                <EmptyState
                  title="No formulas yet"
                  body="Add the formulas you need for your subjects — they stay on this phone."
                  actionLabel="Add a formula"
                  onAction={openAdd}
                  icon={<BookIcon size={26} color={colors.mintDark} />}
                />
                <View style={styles.starterWrap}>
                  <ToolButton
                    label="Load starter formulas"
                    tone="mint"
                    onPress={loadStarter}
                    icon={<SparkleIcon size={15} color={colors.mintDark} strokeWidth={2} />}
                  />
                </View>
                <Text style={styles.starterCaption}>
                  {`Adds ${STARTER_FORMULAS.length} example formulas you can edit or delete.`}
                </Text>
              </>
            ) : (
              <>
                {pinned.length > 0 ? (
                  <>
                    <SectionLabel>PINNED</SectionLabel>
                    <View style={styles.pinnedCard}>
                      {pinned.map((formula, index) => (
                        <PinnedRow
                          key={formula.id}
                          formula={formula}
                          first={index === 0}
                          onOpen={openEdit}
                        />
                      ))}
                    </View>
                  </>
                ) : null}

                {results.length === 0 ? (
                  <EmptyHint
                    trimmedQuery={trimmedQuery}
                    onAdd={openAdd}
                    onClearSearch={() => setQuery('')}
                  />
                ) : subjectId === ALL_SUBJECT_KEY ? (
                  groups.map((group) => (
                    <View key={group.subjectId}>
                      <SubjectGroupHeader
                        subjectId={group.subjectId}
                        count={group.items.length}
                      />
                      {group.items.map(renderCard)}
                    </View>
                  ))
                ) : (
                  <>
                    <SectionLabel>
                      {`${subjectOf(subjectId).name.toUpperCase()} · ${results.length}`}
                    </SectionLabel>
                    {results.map(renderCard)}
                  </>
                )}
              </>
            )}
          </>
        )}
      </ToolScaffold>

      <FormulaForm
        visible={formOpen}
        editing={editing}
        defaultSubjectId={defaultSubjectId}
        onClose={closeForm}
        onSave={saveFormula}
      />
    </>
  );
}

/* ---------------------------------------------------------------- */
/* Styles                                                            */
/* ---------------------------------------------------------------- */

const styles = StyleSheet.create({
  loading: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 56 },
  loadingText: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.muted },

  searchWrap: {
    marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: {
    flex: 1, padding: 0, fontFamily: fonts.medium, fontSize: 12.5, color: colors.ink,
  },

  chipScroll: { flexGrow: 0, marginTop: 12 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 4 },

  pinnedCard: {
    backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.line, paddingHorizontal: 14, ...shadow.card,
  },
  pinnedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  pinnedRowDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  pinnedBody: { flex: 1 },
  pinnedName: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.ink },
  pinnedExpression: {
    fontFamily: fonts.regular, fontSize: 11, color: colors.body, marginTop: 2,
  },

  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 20, marginBottom: 10,
  },
  groupEmoji: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  groupName: {
    flex: 1, fontFamily: fonts.bold, fontSize: 12.5, letterSpacing: -0.1, color: colors.ink,
  },
  groupCount: { fontFamily: fonts.semibold, fontSize: 10.5, color: colors.muted },

  card: {
    backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.line, padding: 16, marginBottom: 10, ...shadow.card,
  },
  cardPressed: { opacity: 0.94 },
  subjectChip: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill,
  },
  subjectEmoji: { fontFamily: fonts.regular, fontSize: 10, color: colors.inkSoft },
  subjectChipLabel: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 9.5, letterSpacing: 0.2 },
  name: {
    fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.ink, marginTop: 10,
  },
  expressionPanel: {
    backgroundColor: colors.mintMist, borderRadius: radius.md, padding: 12, marginTop: 8,
  },
  expression: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.ink },
  note: {
    fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17, color: colors.body, marginTop: 8,
  },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  actionPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10,
    paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line,
  },
  actionPillActive: { backgroundColor: colors.mintSoft, borderColor: colors.mintSoft },
  actionLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.2, color: colors.body },
  actionLabelActive: { color: colors.mintDark },
  actionLabelDanger: { color: colors.danger },
  pressed: { opacity: 0.8 },

  starterWrap: { marginTop: 10 },
  starterCaption: {
    fontFamily: fonts.regular, fontSize: 10.5, lineHeight: 15, color: colors.muted,
    textAlign: 'center', marginTop: 8,
  },

  formBackdrop: { flex: 1, backgroundColor: 'rgba(14,26,21,0.42)', justifyContent: 'flex-end' },
  formSheet: {
    backgroundColor: colors.white, borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl, paddingHorizontal: 18, paddingTop: 10,
    maxHeight: '90%', ...shadow.float,
  },
  grabber: {
    alignSelf: 'center', width: 38, height: 4, borderRadius: 2,
    backgroundColor: colors.line, marginBottom: 14,
  },
  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  formTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink, letterSpacing: -0.2 },
  formClose: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  formScroll: { flexGrow: 0, marginTop: 4 },
  formContent: { paddingBottom: 6 },
  plainField: { marginTop: 14 },
  formLabel: {
    fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 1.4,
    color: colors.muted, marginBottom: 7,
  },
  formChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fieldInput: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11,
    fontFamily: fonts.medium, fontSize: 13, color: colors.ink,
  },
  formulaInput: { minHeight: 62, textAlignVertical: 'top' },
  error: {
    fontFamily: fonts.medium, fontSize: 10.5, lineHeight: 15,
    color: colors.danger, marginTop: 6,
  },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  formButton: { flex: 1 },
});
