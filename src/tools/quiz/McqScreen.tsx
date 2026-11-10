/**
 * MCQ Practice — built around the student's own questions.
 *
 * Two modes share this screen:
 * - "Practice" builds a shuffled attempt from the student's questions for a
 *   subject, then reviews only what was missed.
 * - "My questions" is the authoring side: create, edit and delete questions,
 *   organised per subject. The bundled starter set is an optional import.
 *
 * A finished attempt is recorded once, inside the finish handler (never in
 * render or an effect).
 */
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckIcon, PlusIcon, SparkleIcon, TrashIcon } from '../../components/Icons';
import {
  EmptyState,
  InlineNotice,
  OptionChip,
  SectionLabel,
  ToolButton,
  ToolScaffold,
} from '../../components/tool-kit';
import { Segmented } from '../../components/ui';
import { useActivity } from '../../lib/activity/ActivityContext';
import { STORAGE_PREFIX, usePersistentState } from '../../lib/storage';
import { getSubject, SUBJECTS } from '../../lib/subjects';
import { useBackHandler } from '../../lib/useBackHandler';
import { colors, fonts, radius, shadow } from '../../theme';
import { STARTER_QUESTIONS } from './bank';
import {
  attemptPercent,
  buildAttempt,
  countBySubject,
  createQuestion,
  emptyDraft,
  isQuestionValid,
  mergeStarter,
  missedQuestions,
  OPTION_LETTERS,
  QUIZ_SIZES,
  questionsFor,
  quizXp,
  removeQuestion,
  scoreAttempt,
  toDraft,
  updateQuestion,
  validateQuestion,
  type McqQuestion,
  type QuestionDraft,
  type QuizSize,
} from './model';

const MODES = ['practice', 'questions'] as const;
type Mode = (typeof MODES)[number];

type Stage = 'setup' | 'quiz' | 'result';
type SizeChoice = QuizSize | 'all';
type OptionStatus = 'idle' | 'correct' | 'wrong';
type Notice = { tone: 'success' | 'info'; message: string };

/** Soft error tint used by the design's danger surfaces (see InlineNotice). */
const SOFT_RED = '#FDF0EE';
/** `SUBJECTS` is static and never empty, so the first subject is the default. */
const DEFAULT_SUBJECT_ID = SUBJECTS[0].id;

export default function McqScreen({ onClose }: { onClose: () => void }) {
  const { events, record } = useActivity();
  const questions = usePersistentState<McqQuestion[]>(`${STORAGE_PREFIX}myQuestions`, []);

  const [mode, setMode] = useState<Mode>('practice');
  const [stage, setStage] = useState<Stage>('setup');
  const [subjectId, setSubjectId] = useState(DEFAULT_SUBJECT_ID);
  /** `null` means "not chosen yet", so the smallest available size wins. */
  const [size, setSize] = useState<SizeChoice | null>(null);
  const [attempt, setAttempt] = useState<McqQuestion[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [editing, setEditing] = useState<McqQuestion | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  /** Guards the ledger write, so one finished attempt is recorded exactly once. */
  const recordedRef = useRef(false);

  useBackHandler(
    useCallback(() => {
      onClose();
      return true;
    }, [onClose]),
  );

  if (!questions.hydrated) {
    return (
      <ToolScaffold title="MCQ Practice" subtitle="Loading your questions" onBack={onClose}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.mintDeep} />
          <Text style={styles.loadingText}>Loading your questions…</Text>
        </View>
      </ToolScaffold>
    );
  }

  const subjectName = getSubject(subjectId)?.name ?? 'Subject';
  const counts = countBySubject(questions.value);
  const subjectQuestions = questionsFor(questions.value, subjectId);
  const available = subjectQuestions.length;

  const sizeChoices: SizeChoice[] = [
    ...QUIZ_SIZES.filter((count) => count <= available),
    'all',
  ];
  const chosenSize: SizeChoice =
    size !== null && sizeChoices.includes(size) ? size : (sizeChoices[0] ?? 'all');

  const total = attempt.length;
  const current = attempt[index];
  const correct = scoreAttempt(answers, attempt);
  const percent = attemptPercent(correct, total);
  const xp = quizXp(correct, total);
  const missed = missedQuestions(answers, attempt);

  const history = events.filter(
    (event) => event.kind === 'quiz' && event.subjectId === subjectId,
  );
  const attempts = history.length;
  const best = history.reduce((top, event) => Math.max(top, event.score ?? 0), 0);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setNotice(null);
    if (stage !== 'setup') {
      setStage('setup');
      setAttempt([]);
      setAnswers([]);
      setIndex(0);
      setPicked(null);
    }
  };

  const startPractice = () => {
    const count = chosenSize === 'all' ? available : chosenSize;
    const next = buildAttempt(questions.value, subjectId, count);
    if (next.length === 0) return;
    recordedRef.current = false;
    setAttempt(next);
    setAnswers(next.map(() => null));
    setIndex(0);
    setPicked(null);
    setStage('quiz');
    setNotice(null);
  };

  const choose = (optionIndex: number) => {
    if (picked !== null) return;
    setPicked(optionIndex);
    setAnswers((previous) => {
      const next = [...previous];
      next[index] = optionIndex;
      return next;
    });
  };

  const finishAttempt = () => {
    if (recordedRef.current) return;
    recordedRef.current = true;

    const totalQuestions = attempt.length;
    const correctAnswers = scoreAttempt(answers, attempt);
    const finalPercent = attemptPercent(correctAnswers, totalQuestions);
    record({
      kind: 'quiz',
      subjectId,
      message: `Scored ${finalPercent}% on ${subjectName} quiz`,
      xp: quizXp(correctAnswers, totalQuestions),
      score: finalPercent,
      detail: { correct: correctAnswers, total: totalQuestions },
    });
    setStage('result');
  };

  const advance = () => {
    if (picked === null) return;
    if (index >= total - 1) {
      finishAttempt();
      return;
    }
    setIndex(index + 1);
    setPicked(null);
  };

  const loadStarter = () => {
    const merged = mergeStarter(questions.value, STARTER_QUESTIONS);
    const added = merged.length - questions.value.length;
    if (added > 0) {
      questions.setValue(merged);
      setNotice({
        tone: 'success',
        message: `${added} starter ${added === 1 ? 'question' : 'questions'} added. Edit them like your own.`,
      });
    } else {
      setNotice({ tone: 'info', message: 'The starter questions are already in your list.' });
    }
  };

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (question: McqQuestion) => {
    setEditing(question);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const saveQuestion = (draft: QuestionDraft) => {
    if (editing) {
      const id = editing.id;
      questions.setValue((previous) => updateQuestion(previous, id, draft));
      setNotice({ tone: 'success', message: 'Question updated.' });
    } else {
      questions.setValue((previous) => [...previous, createQuestion(draft)]);
      setNotice({ tone: 'success', message: 'Question saved. It is ready to practise.' });
    }
    setSubjectId(draft.subjectId);
    setFormOpen(false);
    setEditing(null);
  };

  const confirmDelete = (question: McqQuestion) => {
    Alert.alert('Delete question?', question.prompt, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          questions.setValue((previous) => removeQuestion(previous, question.id));
          setNotice({ tone: 'info', message: 'Question deleted.' });
        },
      },
    ]);
  };

  const subtitle = mode === 'questions'
    ? `${subjectQuestions.length} in ${subjectName}`
    : stage === 'quiz'
      ? `Question ${index + 1} of ${total}`
      : stage === 'result'
        ? `${percent}% · ${correct} of ${total} correct`
        : `Your own questions · ${available} in ${subjectName}`;

  return (
    <>
      <ToolScaffold
        title="MCQ Practice"
        subtitle={subtitle}
        onBack={onClose}
        footer={
          mode === 'questions' ? (
            <ToolButton
              label="Add a question"
              tone="dark"
              icon={<PlusIcon size={15} color={colors.white} />}
              onPress={openAdd}
            />
          ) : null
        }
      >
        <Segmented
          options={MODES}
          value={mode}
          onChange={switchMode}
          formatLabel={(option) => (option === 'practice' ? 'Practice' : 'My questions')}
        />

        {notice ? (
          <InlineNotice
            tone={notice.tone}
            message={notice.message}
            actionLabel="Dismiss"
            onAction={() => setNotice(null)}
          />
        ) : null}

        {stage === 'setup' ? (
          <>
            <SectionLabel>SUBJECT</SectionLabel>
            <View style={styles.chipRow}>
              {SUBJECTS.map((subject) => (
                <OptionChip
                  key={subject.id}
                  label={`${subject.emoji} ${subject.name} ${counts[subject.id] ?? 0}`}
                  active={subject.id === subjectId}
                  onPress={() => setSubjectId(subject.id)}
                />
              ))}
            </View>
          </>
        ) : null}

        {mode === 'practice' ? (
          stage === 'setup' ? (
            <>
              {attempts > 0 ? (
                <View style={styles.historyCard}>
                  <View style={styles.historyIcon}>
                    <CheckIcon size={16} color={colors.mintDark} />
                  </View>
                  <Text style={styles.historyText}>
                    Best score {best}% · {attempts} {attempts === 1 ? 'attempt' : 'attempts'}
                  </Text>
                </View>
              ) : null}

              {available === 0 ? (
                <>
                  <EmptyState
                    title="No questions for this subject"
                    body="Add a few in My questions and practise them here."
                    actionLabel="Go to My questions"
                    onAction={() => switchMode('questions')}
                    icon={<SparkleIcon size={26} color={colors.mintDark} />}
                  />
                  <View style={styles.secondaryWrap}>
                    <ToolButton
                      label="Load starter questions"
                      tone="outline"
                      onPress={loadStarter}
                    />
                  </View>
                </>
              ) : (
                <>
                  <SectionLabel>QUESTIONS</SectionLabel>
                  <View style={styles.chipRow}>
                    {sizeChoices.map((choice) => (
                      <OptionChip
                        key={choice}
                        label={choice === 'all' ? `All (${available})` : `${choice}`}
                        active={choice === chosenSize}
                        onPress={() => setSize(choice)}
                      />
                    ))}
                  </View>
                  <View style={styles.startWrap}>
                    <ToolButton label="Start practice" tone="dark" onPress={startPractice} />
                  </View>
                </>
              )}
            </>
          ) : stage === 'quiz' ? (
            current ? (
              <>
                <Text style={styles.progressLabel}>{`QUESTION ${index + 1} OF ${total}`}</Text>
                <View
                  style={styles.progressTrack}
                  accessibilityRole="progressbar"
                  accessibilityValue={{ min: 0, max: total, now: index + 1 }}
                >
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${((index + 1) / Math.max(total, 1)) * 100}%` },
                    ]}
                  />
                </View>

                <View style={styles.questionCard}>
                  <Text style={styles.questionText}>{current.prompt}</Text>
                </View>

                {current.options.map((option, optionIndex) => {
                  const isCorrect = optionIndex === current.answer;
                  const isPicked = picked === optionIndex;
                  const status: OptionStatus =
                    picked === null ? 'idle' : isCorrect ? 'correct' : isPicked ? 'wrong' : 'idle';
                  return (
                    <OptionRow
                      key={`${current.id}-${optionIndex}`}
                      letter={OPTION_LETTERS[optionIndex] ?? ''}
                      label={option}
                      status={status}
                      selected={isPicked}
                      disabled={picked !== null}
                      onPress={() => choose(optionIndex)}
                    />
                  );
                })}

                {picked !== null ? (
                  <View style={styles.explainCard}>
                    <Text style={styles.explainTitle}>
                      Correct answer: {current.options[current.answer]}
                    </Text>
                    {current.explain ? (
                      <Text style={styles.explainBody}>{current.explain}</Text>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.nextWrap}>
                  <ToolButton
                    label={index >= total - 1 ? 'Finish attempt' : 'Next question'}
                    onPress={advance}
                    disabled={picked === null}
                  />
                </View>
              </>
            ) : null
          ) : (
            <>
              <ResultCard percent={percent} correct={correct} total={total} xp={xp} />

              {missed.length > 0 ? (
                <>
                  <SectionLabel>WHAT TO REVIEW</SectionLabel>
                  {missed.map((item) => (
                    <ReviewItem
                      key={item.question.id}
                      question={item.question}
                      chosen={item.chosen}
                    />
                  ))}
                </>
              ) : (
                <EmptyState
                  title="Flawless run"
                  body="Every answer was correct. Try a larger set or another subject to keep the streak going."
                  icon={<SparkleIcon size={26} color={colors.mintDark} />}
                />
              )}

              <View style={styles.actions}>
                <ToolButton
                  label="Try again"
                  tone="outline"
                  onPress={startPractice}
                  style={styles.actionButton}
                />
                <ToolButton
                  label="Done"
                  tone="dark"
                  onPress={onClose}
                  style={styles.actionButton}
                />
              </View>
            </>
          )
        ) : subjectQuestions.length === 0 ? (
          <>
            <EmptyState
              title="No questions yet"
              body="Write questions from your notes, past papers or class — then practise them."
              actionLabel="Add a question"
              onAction={openAdd}
              icon={<SparkleIcon size={26} color={colors.mintDark} />}
            />
            <View style={styles.secondaryWrap}>
              <ToolButton label="Load starter questions" tone="outline" onPress={loadStarter} />
            </View>
          </>
        ) : (
          <>
            <SectionLabel>YOUR QUESTIONS</SectionLabel>
            {subjectQuestions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                onEdit={openEdit}
                onDelete={confirmDelete}
              />
            ))}
          </>
        )}
      </ToolScaffold>

      {formOpen ? (
        <QuestionForm
          question={editing}
          defaultSubjectId={subjectId}
          onCancel={closeForm}
          onSave={saveQuestion}
        />
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                             */
/* ------------------------------------------------------------------ */

function OptionRow({
  letter,
  label,
  status,
  selected,
  disabled,
  onPress,
}: {
  letter: string;
  label: string;
  status: OptionStatus;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const stateLabel = status === 'correct'
    ? ', correct answer'
    : status === 'wrong'
      ? ', your answer, incorrect'
      : '';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${letter}. ${label}${stateLabel}`}
      accessibilityState={{ selected, disabled }}
      style={({ pressed }) => [
        styles.option,
        status === 'correct' && styles.optionCorrect,
        status === 'wrong' && styles.optionWrong,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.optionBadge,
          status === 'correct' && styles.optionBadgeCorrect,
          status === 'wrong' && styles.optionBadgeWrong,
        ]}
      >
        <Text
          style={[
            styles.optionBadgeText,
            status === 'correct' && styles.optionBadgeTextCorrect,
            status === 'wrong' && styles.optionBadgeTextWrong,
          ]}
        >
          {letter}
        </Text>
      </View>
      <Text style={styles.optionText}>{label}</Text>
    </Pressable>
  );
}

function QuestionCard({
  question,
  onEdit,
  onDelete,
}: {
  question: McqQuestion;
  onEdit: (question: McqQuestion) => void;
  onDelete: (question: McqQuestion) => void;
}) {
  const answerText = question.options[question.answer] ?? '';

  return (
    <View style={styles.listCard}>
      <Text style={styles.listPrompt} numberOfLines={2}>
        {question.prompt}
      </Text>
      <Text style={styles.listMeta} numberOfLines={1}>
        Answer: {answerText} · {question.options.length} options
      </Text>

      <View style={styles.cardActions}>
        <Pressable
          onPress={() => onEdit(question)}
          accessibilityRole="button"
          accessibilityLabel="Edit question"
          style={({ pressed }) => [styles.cardAction, pressed && styles.pressed]}
        >
          <Text style={styles.cardActionText}>Edit</Text>
        </Pressable>
        <Pressable
          onPress={() => onDelete(question)}
          accessibilityRole="button"
          accessibilityLabel="Delete question"
          style={({ pressed }) => [styles.cardAction, pressed && styles.pressed]}
        >
          <TrashIcon size={14} color={colors.danger} />
          <Text style={[styles.cardActionText, styles.cardActionDanger]}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

function QuestionForm({
  question,
  defaultSubjectId,
  onCancel,
  onSave,
}: {
  question: McqQuestion | null;
  defaultSubjectId: string;
  onCancel: () => void;
  onSave: (draft: QuestionDraft) => void;
}) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<QuestionDraft>(() =>
    question ? toDraft(question) : emptyDraft(defaultSubjectId),
  );
  const [showErrors, setShowErrors] = useState(false);
  const errors = validateQuestion(draft);

  const patch = (next: Partial<QuestionDraft>) => {
    setDraft((previous) => ({ ...previous, ...next }));
  };

  const setOption = (optionIndex: number, text: string) => {
    setDraft((previous) => {
      const options = [...previous.options];
      options[optionIndex] = text;
      return { ...previous, options };
    });
  };

  const save = () => {
    if (!isQuestionValid(draft)) {
      setShowErrors(true);
      return;
    }
    onSave(draft);
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalBackdrop}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Close question editor"
        />

        <View style={[styles.formCard, { paddingBottom: insets.bottom + 14 }]}>
          <View style={styles.grabber} />
          <Text style={styles.formTitle}>{question ? 'Edit question' : 'New question'}</Text>
          <Text style={styles.formHint}>
            Pick the correct answer with the circle on the right.
          </Text>

          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <SectionLabel>SUBJECT</SectionLabel>
            <View style={styles.chipRow}>
              {SUBJECTS.map((subject) => (
                <OptionChip
                  key={subject.id}
                  label={`${subject.emoji} ${subject.name}`}
                  active={subject.id === draft.subjectId}
                  onPress={() => patch({ subjectId: subject.id })}
                />
              ))}
            </View>

            <SectionLabel>QUESTION</SectionLabel>
            <TextInput
              value={draft.prompt}
              onChangeText={(prompt) => patch({ prompt })}
              placeholder="e.g. Which organelle produces most of the cell's ATP?"
              placeholderTextColor={colors.muted}
              multiline
              maxLength={240}
              style={styles.formPromptInput}
              accessibilityLabel="Question"
            />
            {showErrors && errors.prompt ? (
              <Text style={styles.errorText}>{errors.prompt}</Text>
            ) : null}

            <SectionLabel>ANSWERS</SectionLabel>
            {OPTION_LETTERS.map((letter, optionIndex) => {
              const selected = draft.answer === optionIndex;
              return (
                <View
                  key={letter}
                  style={[styles.formOption, selected && styles.formOptionCorrect]}
                >
                  <Text
                    style={[
                      styles.formOptionLetter,
                      selected && styles.formOptionLetterCorrect,
                    ]}
                  >
                    {letter}
                  </Text>
                  <TextInput
                    value={draft.options[optionIndex] ?? ''}
                    onChangeText={(text) => setOption(optionIndex, text)}
                    placeholder={`Answer ${letter}`}
                    placeholderTextColor={colors.muted}
                    maxLength={90}
                    style={styles.formOptionInput}
                    accessibilityLabel={`Answer ${letter}`}
                  />
                  <Pressable
                    onPress={() => patch({ answer: optionIndex })}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Mark answer ${letter} as correct`}
                    accessibilityState={{ selected }}
                    style={styles.radioHit}
                  >
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected ? <View style={styles.radioDot} /> : null}
                    </View>
                  </Pressable>
                </View>
              );
            })}
            {showErrors && errors.options ? (
              <Text style={styles.errorText}>{errors.options}</Text>
            ) : null}
            {showErrors && errors.answer ? (
              <Text style={styles.errorText}>{errors.answer}</Text>
            ) : null}

            <SectionLabel>EXPLANATION (OPTIONAL)</SectionLabel>
            <TextInput
              value={draft.explain}
              onChangeText={(explain) => patch({ explain })}
              placeholder="Why is that the answer?"
              placeholderTextColor={colors.muted}
              multiline
              maxLength={240}
              style={styles.formExplainInput}
              accessibilityLabel="Explanation"
            />
          </ScrollView>

          <View style={styles.formActions}>
            <ToolButton
              label="Cancel"
              tone="outline"
              onPress={onCancel}
              style={styles.actionButton}
            />
            <ToolButton label="Save" tone="dark" onPress={save} style={styles.actionButton} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ResultCard({
  percent,
  correct,
  total,
  xp,
}: {
  percent: number;
  correct: number;
  total: number;
  xp: number;
}) {
  return (
    <View style={styles.resultCard}>
      <Text style={styles.resultPercent}>{percent}%</Text>
      <Text style={styles.resultLine}>
        You got {correct} of {total} correct
      </Text>
      <View style={styles.xpPill}>
        <Text style={styles.xpText}>+{xp} XP</Text>
      </View>
      {percent >= 80 ? (
        <Text style={styles.resultBonus}>
          Includes the +10 XP bonus for scoring 80% or more.
        </Text>
      ) : null}
    </View>
  );
}

function ReviewItem({
  question,
  chosen,
}: {
  question: McqQuestion;
  chosen: number | null;
}) {
  const chosenOption = chosen === null ? null : question.options[chosen] ?? null;

  return (
    <View style={styles.reviewCard}>
      <Text style={styles.reviewPrompt}>{question.prompt}</Text>
      <Text style={styles.reviewChosen}>
        {chosenOption === null ? 'You skipped this one.' : `You chose: ${chosenOption}`}
      </Text>
      <Text style={styles.reviewCorrect}>
        Correct: {question.options[question.answer] ?? ''}
      </Text>
      {question.explain ? (
        <Text style={styles.reviewExplain}>{question.explain}</Text>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  loading: {
    marginTop: 64,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: colors.muted,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  secondaryWrap: {
    marginTop: 12,
  },
  historyCard: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.card,
  },
  historyIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyText: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 12.5,
    color: colors.ink,
  },
  startWrap: {
    marginTop: 20,
  },
  progressLabel: {
    marginTop: 4,
    fontFamily: fonts.semibold,
    fontSize: 10.5,
    letterSpacing: 1.4,
    color: colors.muted,
  },
  progressTrack: {
    height: 6,
    marginTop: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.mintDeep,
  },
  questionCard: {
    marginTop: 14,
    padding: 18,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.card,
  },
  questionText: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 23,
    color: colors.ink,
  },
  option: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  optionCorrect: {
    borderColor: colors.mint,
    backgroundColor: colors.mintMist,
  },
  optionWrong: {
    borderColor: colors.danger,
    backgroundColor: SOFT_RED,
  },
  pressed: {
    opacity: 0.86,
  },
  optionBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBadgeCorrect: {
    backgroundColor: colors.mintSoft,
  },
  optionBadgeWrong: {
    backgroundColor: colors.white,
  },
  optionBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.body,
  },
  optionBadgeTextCorrect: {
    color: colors.mintDark,
  },
  optionBadgeTextWrong: {
    color: colors.danger,
  },
  optionText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink,
  },
  explainCard: {
    marginTop: 14,
    padding: 14,
    backgroundColor: colors.mintMist,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.mintSoft,
  },
  explainTitle: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: colors.mintDark,
  },
  explainBody: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.body,
  },
  nextWrap: {
    marginTop: 16,
  },
  resultCard: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.card,
  },
  resultPercent: {
    fontFamily: fonts.extra,
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: -1,
    color: colors.ink,
  },
  resultLine: {
    marginTop: 2,
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.body,
  },
  xpPill: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.mintSoft,
  },
  xpText: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    letterSpacing: 0.3,
    color: colors.mintDark,
  },
  resultBonus: {
    marginTop: 10,
    fontFamily: fonts.regular,
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.muted,
    textAlign: 'center',
  },
  reviewCard: {
    marginTop: 10,
    padding: 14,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  reviewPrompt: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink,
  },
  reviewChosen: {
    marginTop: 8,
    fontFamily: fonts.medium,
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.danger,
  },
  reviewCorrect: {
    marginTop: 2,
    fontFamily: fonts.medium,
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.mintDark,
  },
  reviewExplain: {
    marginTop: 8,
    fontFamily: fonts.regular,
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.body,
  },
  actions: {
    marginTop: 22,
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
  listCard: {
    marginTop: 10,
    padding: 14,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.card,
  },
  listPrompt: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink,
  },
  listMeta: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.muted,
  },
  cardActions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  cardActionText: {
    fontFamily: fonts.semibold,
    fontSize: 10.5,
    color: colors.inkSoft,
  },
  cardActionDanger: {
    color: colors.danger,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(14,26,21,0.42)',
  },
  formCard: {
    maxHeight: '90%',
    paddingHorizontal: 18,
    paddingTop: 10,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    ...shadow.float,
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: 14,
  },
  formTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  formHint: {
    marginTop: 4,
    fontFamily: fonts.regular,
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.body,
  },
  formScroll: {
    flexShrink: 1,
  },
  formScrollContent: {
    paddingBottom: 6,
  },
  formPromptInput: {
    minHeight: 76,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  formOption: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 4,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  formOptionCorrect: {
    borderColor: colors.mint,
    backgroundColor: colors.mintMist,
  },
  formOptionLetter: {
    width: 14,
    textAlign: 'center',
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.muted,
  },
  formOptionLetterCorrect: {
    color: colors.mintDark,
  },
  formOptionInput: {
    flex: 1,
    paddingHorizontal: 2,
    paddingVertical: 9,
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.ink,
  },
  radioHit: {
    padding: 6,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.8,
    borderColor: colors.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.mintDeep,
    backgroundColor: colors.mintSoft,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.mintDeep,
  },
  formExplainInput: {
    minHeight: 66,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  errorText: {
    marginTop: 6,
    fontFamily: fonts.medium,
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.danger,
  },
  formActions: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
});
