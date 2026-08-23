import { Lucide } from '@react-native-vector-icons/lucide';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';

import { feedback } from '@/services/feedback';
import { parseCodeToRenderTree, validateChallengeRequirements, validateRenderRules } from './code-preview';
import { QUESTION_COLORS, QUESTION_INPUT_ACCESSORY_ID } from './question-constants';
import { createInitialArrangeOrder } from './arrange-order';
import {
  CodeCard,
  CodeFilesEditor,
  DevicePreview,
  DraggableChip,
  DraggableRow,
  IconButton,
  RuleList,
  SelectionCard,
  TemplateFields,
} from './question-ui';
import type {
  ArrangeInOrderAnswer,
  ArrangeInOrderQuestion,
  BuildAndRenderAnswer,
  BuildAndRenderQuestion,
  CodeFile,
  CompleteCodeAnswer,
  CompleteCodeQuestion,
  CustomValidatorRegistry,
  DragDropBuilderAnswer,
  DragDropBuilderQuestion,
  FillInTheBlankAnswer,
  FillInTheBlankQuestion,
  FindErrorAnswer,
  FindErrorQuestion,
  GuessThreeThingsAnswer,
  GuessThreeThingsQuestion,
  IdentifyComponentAnswer,
  IdentifyComponentQuestion,
  MatchPairsAnswer,
  MatchPairsQuestion,
  MiniChallengeAnswer,
  MiniChallengeQuestion,
  MultipleChoiceAnswer,
  MultipleChoiceQuestion,
  MultiSelectAnswer,
  MultiSelectQuestion,
  PredictOutputAnswer,
  PredictOutputQuestion,
  Question,
  QuestionAnswer,
  RenderNode,
  TrueFalseAnswer,
  TrueFalseQuestion,
} from './questions.types';

export type QuestionInteractionProps<Q, A> = {
  question: Q;
  answer?: A;
  disabled?: boolean;
  initializationAttempt?: number;
  onAnswerChange: (answer: A) => void;
  customValidators?: CustomValidatorRegistry;
};

function useStableItems<T extends { id: string }>(items: T[], shuffle?: boolean): T[] {
  return useMemo(() => {
    if (!shuffle) return items;
    return [...items].sort((left, right) => `${left.id}-learn-expo`.localeCompare(`${right.id}-learn-expo`));
  }, [items, shuffle]);
}

export function MultipleChoiceQuestionScreen({ question, answer, disabled, onAnswerChange }: QuestionInteractionProps<MultipleChoiceQuestion, MultipleChoiceAnswer>) {
  const options = useStableItems(question.options, question.shuffleOptions);
  return (
    <View style={styles.sectionGap}>
      {question.codeSnippet ? <CodeCard code={question.codeSnippet} /> : null}
      <View style={styles.list}>{options.map((option) => <SelectionCard key={option.id} label={option.text} detail={option.code} selected={answer?.selectedOptionId === option.id} disabled={disabled} onPress={() => onAnswerChange({ selectedOptionId: option.id })} />)}</View>
    </View>
  );
}

export function MultiSelectQuestionScreen({ question, answer, disabled, onAnswerChange }: QuestionInteractionProps<MultiSelectQuestion, MultiSelectAnswer>) {
  const options = useStableItems(question.options, question.shuffleOptions);
  const selected = answer?.selectedOptionIds ?? [];
  const maximum = question.maximumSelections ?? question.options.length;
  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((item) => item !== id) : selected.length < maximum ? [...selected, id] : selected;
    onAnswerChange({ selectedOptionIds: next });
  };
  return (
    <View style={styles.sectionGap}>
      <Text selectable style={styles.counter}>{selected.length}/{maximum} selected</Text>
      <View style={styles.list}>{options.map((option) => <SelectionCard key={option.id} label={option.text} selected={selected.includes(option.id)} multiple disabled={disabled || (!selected.includes(option.id) && selected.length >= maximum)} onPress={() => toggle(option.id)} />)}</View>
    </View>
  );
}

export function TrueFalseQuestionScreen({ question, answer, disabled, onAnswerChange }: QuestionInteractionProps<TrueFalseQuestion, TrueFalseAnswer>) {
  return (
    <View style={styles.sectionGap}>
      <View style={styles.statementCard}><Text selectable style={styles.statement}>{question.statement}</Text></View>
      <View style={styles.list}>
        <SelectionCard label="True" selected={answer?.value === true} disabled={disabled} onPress={() => onAnswerChange({ value: true })} />
        <SelectionCard label="False" selected={answer?.value === false} disabled={disabled} onPress={() => onAnswerChange({ value: false })} />
      </View>
    </View>
  );
}

export function FillInTheBlankQuestionScreen({ question, answer, disabled, onAnswerChange }: QuestionInteractionProps<FillInTheBlankQuestion, FillInTheBlankAnswer>) {
  return <TemplateFields template={question.template} fields={question.blanks} values={answer?.values ?? {}} disabled={disabled} onChange={(values) => onAnswerChange({ values })} />;
}

export function MatchPairsQuestionScreen({ question, answer, disabled, onAnswerChange }: QuestionInteractionProps<MatchPairsQuestion, MatchPairsAnswer>) {
  const [activeLeft, setActiveLeft] = useState<string>();
  const pairs = answer?.pairs ?? [];
  const leftItems = useStableItems(question.leftItems, question.shuffleLeft);
  const rightItems = useStableItems(question.rightItems, question.shuffleRight);
  const pairWith = (rightId: string) => {
    if (!activeLeft) return;
    const next = pairs.filter((pair) => pair.leftId !== activeLeft && pair.rightId !== rightId);
    onAnswerChange({ pairs: [...next, { leftId: activeLeft, rightId }] });
    setActiveLeft(undefined);
  };
  return (
    <View style={styles.matchGrid}>
      <View style={styles.matchColumn}>{leftItems.map((item) => {
        const pair = pairs.find((candidate) => candidate.leftId === item.id);
        return <SelectionCard key={item.id} label={item.content} detail={pair ? `Matched to ${question.rightItems.find((right) => right.id === pair.rightId)?.content}` : undefined} selected={activeLeft === item.id || Boolean(pair)} disabled={disabled} onPress={() => setActiveLeft(item.id)} />;
      })}</View>
      <View style={styles.matchColumn}>{rightItems.map((item) => <SelectionCard key={item.id} label={item.content} selected={pairs.some((pair) => pair.rightId === item.id)} disabled={disabled || !activeLeft} onPress={() => pairWith(item.id)} />)}</View>
    </View>
  );
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function ArrangeInOrderQuestionScreen({ question, answer, disabled, initializationAttempt = 0, onAnswerChange }: QuestionInteractionProps<ArrangeInOrderQuestion, ArrangeInOrderAnswer>) {
  const initialOrder = useMemo(
    () => createInitialArrangeOrder(question, initializationAttempt),
    [initializationAttempt, question],
  );
  const ids = answer?.orderedItemIds.length ? answer.orderedItemIds : initialOrder;
  const move = useCallback((from: number, to: number) => onAnswerChange({ orderedItemIds: moveItem(ids, from, to) }), [ids, onAnswerChange]);

  useEffect(() => {
    if (!answer?.orderedItemIds.length) onAnswerChange({ orderedItemIds: initialOrder });
  }, [answer?.orderedItemIds.length, initialOrder, onAnswerChange]);

  return <View style={[styles.list, question.direction === 'horizontal' && styles.horizontalOrder]}>{ids.map((id, index) => {
    const item = question.items.find((candidate) => candidate.id === id);
    return <DraggableRow key={id} index={index} count={ids.length} direction={question.direction} disabled={disabled} onMove={move}><Text selectable style={styles.rowLabel}><Text style={styles.orderNumber}>{index + 1}  </Text>{item?.content}</Text>{item?.code ? <Text selectable style={styles.miniCode}>{item.code}</Text> : null}</DraggableRow>;
  })}</View>;
}

export function CompleteCodeQuestionScreen({ question, answer, disabled, onAnswerChange }: QuestionInteractionProps<CompleteCodeQuestion, CompleteCodeAnswer>) {
  const update = (values: Record<string, string>) => {
    let completedCode = question.codeTemplate;
    Object.entries(values).forEach(([id, value]) => { completedCode = completedCode.replaceAll(`{{${id}}}`, value); });
    onAnswerChange({ values, completedCode });
  };
  return <TemplateFields template={question.codeTemplate} fields={question.blanks} values={answer?.values ?? {}} disabled={disabled} onChange={update} />;
}

export function FindErrorQuestionScreen({ question, answer, disabled, onAnswerChange }: QuestionInteractionProps<FindErrorQuestion, FindErrorAnswer>) {
  const [rangeAnchor, setRangeAnchor] = useState<number>();
  const selected = answer?.selectedRanges ?? [];
  const selectLine = (line: number) => {
    if (question.selectionMode === 'range') {
      if (rangeAnchor === undefined) { setRangeAnchor(line); return; }
      const range = { startLine: Math.min(rangeAnchor, line), endLine: Math.max(rangeAnchor, line) };
      onAnswerChange({ ...answer, selectedRanges: [range] });
      setRangeAnchor(undefined);
      return;
    }
    const exists = selected.some((range) => range.startLine === line);
    onAnswerChange({ ...answer, selectedRanges: exists ? selected.filter((range) => range.startLine !== line) : [...selected, { startLine: line }] });
  };
  if (question.selectionMode === 'token') {
    return (
      <View style={styles.codeCardAlt}>{question.code.split('\n').map((line, lineIndex) => (
        <View key={lineIndex} style={styles.tokenLine}>
          <Text selectable style={styles.tokenLineNumber}>{lineIndex + 1}</Text>
          <View style={styles.tokenFlow}>{line.split(/(\s+|[(){};,])/).filter(Boolean).map((token, tokenIndex) => {
            const startColumn = line.indexOf(token) + 1;
            const active = selected.some((range) => range.startLine === lineIndex + 1 && range.startColumn === startColumn);
            return <Pressable key={`${token}-${tokenIndex}`} disabled={disabled || /^\s+$/.test(token)} onPress={() => {
              feedback.play('buttonTap');
              onAnswerChange({ ...answer, selectedRanges: active ? selected.filter((range) => !(range.startLine === lineIndex + 1 && range.startColumn === startColumn)) : [...selected, { startLine: lineIndex + 1, startColumn, endColumn: startColumn + token.length }] });
            }} style={[styles.token, active && styles.tokenActive]}><Text selectable style={styles.miniCode}>{token}</Text></Pressable>;
          })}</View>
        </View>
      ))}</View>
    );
  }
  return (
    <View style={styles.sectionGap}>
      {rangeAnchor ? <Text selectable style={styles.helper}>Now select the end of the range.</Text> : null}
      <CodeCard code={question.code} selectedLines={selected.flatMap((range) => {
        const end = range.endLine ?? range.startLine;
        return Array.from({ length: end - range.startLine + 1 }, (_, index) => range.startLine + index);
      })} onLinePress={disabled ? undefined : selectLine} />
      <TextInput editable={!disabled} inputAccessoryViewID={QUESTION_INPUT_ACCESSORY_ID} keyboardType={Platform.OS === 'ios' ? 'ascii-capable' : 'default'} multiline placeholder="Optional correction" placeholderTextColor="#9AA0AC" value={answer?.correction ?? ''} onChangeText={(correction) => onAnswerChange({ selectedRanges: selected, correction })} style={styles.correctionInput} />
    </View>
  );
}

export function PredictOutputQuestionScreen({ question, answer, disabled, onAnswerChange }: QuestionInteractionProps<PredictOutputQuestion, PredictOutputAnswer>) {
  const selectedTree = answer?.mode === 'ui_preview' ? JSON.stringify(answer.renderTree) : '';
  return (
    <View style={styles.sectionGap}>
      <CodeCard code={question.code} />
      {question.answerMode === 'text' ? <TextInput editable={!disabled} inputAccessoryViewID={QUESTION_INPUT_ACCESSORY_ID} onSubmitEditing={Keyboard.dismiss} placeholder="Type the output" placeholderTextColor="#9AA0AC" returnKeyType="done" value={answer?.mode === 'text' ? answer.value : ''} onChangeText={(value) => onAnswerChange({ mode: 'text', value })} style={styles.answerInput} /> : null}
      {question.answerMode === 'multiple_choice' ? <View style={styles.list}>{question.options?.map((option) => <SelectionCard key={option.id} label={option.text ?? 'Preview option'} selected={answer?.mode === 'multiple_choice' && answer.selectedOptionId === option.id} disabled={disabled} onPress={() => onAnswerChange({ mode: 'multiple_choice', selectedOptionId: option.id })} />)}</View> : null}
      {question.answerMode === 'ui_preview' ? <View style={styles.previewOptions}>{question.options?.filter((option) => option.uiTree).map((option) => <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ checked: selectedTree === JSON.stringify(option.uiTree) }} disabled={disabled} onPress={() => {
        if (!option.uiTree) return;
        feedback.play('buttonTap');
        onAnswerChange({ mode: 'ui_preview', renderTree: option.uiTree });
      }} style={[styles.previewOption, selectedTree === JSON.stringify(option.uiTree) && styles.previewOptionSelected]}><DevicePreview tree={option.uiTree} label={option.text ?? 'Preview option'} /></Pressable>)}</View> : null}
    </View>
  );
}

export function IdentifyComponentQuestionScreen({ question, answer, disabled, onAnswerChange }: QuestionInteractionProps<IdentifyComponentQuestion, IdentifyComponentAnswer>) {
  const options = useStableItems(question.options, question.shuffleOptions);
  return (
    <View style={styles.sectionGap}>
      <Text selectable style={styles.helper}>{question.taskDescription}</Text>
      <View style={styles.cardGrid}>{options.map((option) => <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ checked: answer?.selectedComponentId === option.id }} disabled={disabled} onPress={() => {
        feedback.play('buttonTap');
        onAnswerChange({ selectedComponentId: option.id });
      }} style={[styles.componentCard, answer?.selectedComponentId === option.id && styles.componentCardSelected]}><Lucide name={option.componentName === 'Image' ? 'image' : option.componentName === 'TextInput' ? 'text-cursor-input' : option.componentName === 'Pressable' ? 'mouse-pointer-click' : 'square-dashed'} size={28} color={answer?.selectedComponentId === option.id ? QUESTION_COLORS.green : QUESTION_COLORS.muted} /><Text selectable style={styles.componentName}>{option.code ?? `<${option.componentName} />`}</Text></Pressable>)}</View>
    </View>
  );
}

type SlotRect = { x: number; y: number; width: number; height: number };

export function DragDropBuilderQuestionScreen({ question, answer, disabled, onAnswerChange }: QuestionInteractionProps<DragDropBuilderQuestion, DragDropBuilderAnswer>) {
  const [selectedBlock, setSelectedBlock] = useState<string>();
  const slotRefs = useRef<Record<string, View | null>>({});
  const slotRects = useRef<Record<string, SlotRect>>({});
  const placements = useMemo(() => answer?.placements ?? [], [answer?.placements]);
  const placedIds = placements.map((placement) => placement.blockId);
  const available = question.availableBlocks.filter((block) => !placedIds.includes(block.id));
  const selectedBlockData = question.availableBlocks.find((block) => block.id === selectedBlock);

  const registerSlot = (id: string) => {
    requestAnimationFrame(() => slotRefs.current[id]?.measureInWindow((x, y, width, height) => { slotRects.current[id] = { x, y, width, height }; }));
  };
  const addToSlot = useCallback((blockId: string, slotId: string) => {
    const block = question.availableBlocks.find((item) => item.id === blockId);
    const slot = question.slots.find((item) => item.id === slotId);
    if (!block || !slot) return;
    const slotPlacements = placements.filter((item) => item.slotId === slotId);
    const compatible = (!slot.acceptedBlockIds || slot.acceptedBlockIds.includes(blockId)) && (!slot.acceptedBlockTypes || slot.acceptedBlockTypes.includes(block.blockType));
    if (!compatible || slotPlacements.length >= (slot.maximumItems ?? Number.POSITIVE_INFINITY)) return;
    onAnswerChange({ placements: [...placements, { slotId, blockId, position: slotPlacements.length }] });
    setSelectedBlock(undefined);
  }, [onAnswerChange, placements, question.availableBlocks, question.slots]);
  const dropBlock = useCallback((blockId: string, x: number, y: number) => {
    const target = Object.entries(slotRects.current).find(([, rect]) => x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height);
    if (target) addToSlot(blockId, target[0]);
  }, [addToSlot]);
  const movePlacement = (slotId: string, from: number, to: number) => {
    const slotItems = placements.filter((item) => item.slotId === slotId).sort((left, right) => left.position - right.position);
    const reordered = moveItem(slotItems, from, to).map((item, position) => ({ ...item, position }));
    onAnswerChange({ placements: [...placements.filter((item) => item.slotId !== slotId), ...reordered] });
  };

  return (
    <View style={styles.sectionGap}>
      <View style={styles.chipTray}>{available.map((block) => <DraggableChip key={block.id} label={block.displayLabel ?? block.value} disabled={disabled} selected={selectedBlock === block.id} onPress={() => setSelectedBlock(block.id)} onDrop={(x, y) => dropBlock(block.id, x, y)} />)}</View>
      {question.slots.map((slot) => {
        const slotItems = placements.filter((item) => item.slotId === slot.id).sort((left, right) => left.position - right.position);
        return (
          <View key={slot.id} ref={(node) => { slotRefs.current[slot.id] = node; }} onLayout={() => registerSlot(slot.id)} style={styles.builderSlot}>
            <Pressable
              accessibilityLabel={selectedBlockData ? `Add ${selectedBlockData.displayLabel ?? selectedBlockData.value} to builder slot ${slot.id}` : `Builder slot ${slot.id}`}
              accessibilityHint={selectedBlockData ? 'Adds the selected block to this slot' : 'Select a block before using this slot'}
              accessibilityRole="button"
              accessibilityState={{ disabled: disabled || !selectedBlock }}
              disabled={disabled || !selectedBlock}
              onPress={() => {
                if (!selectedBlock) return;
                feedback.play('buttonTap');
                addToSlot(selectedBlock, slot.id);
              }}
              style={({ pressed }) => [styles.slotAction, selectedBlock && styles.slotActionReady, pressed && styles.slotActionPressed]}
            >
              <Text selectable style={styles.slotLabel}>{slot.id}</Text>
              <Text selectable style={[styles.slotActionText, selectedBlock && styles.slotActionTextReady]}>
                {selectedBlockData ? `Add ${selectedBlockData.displayLabel ?? selectedBlockData.value}` : 'Select a block, then tap here'}
              </Text>
            </Pressable>
            {slotItems.length ? <View style={styles.list}>{slotItems.map((placement, index) => {
              const block = question.availableBlocks.find((item) => item.id === placement.blockId);
              return <DraggableRow key={placement.blockId} index={index} count={slotItems.length} disabled={disabled} onMove={(from, to) => movePlacement(slot.id, from, to)}><View style={styles.placedRow}><Text selectable style={styles.miniCode}>{block?.displayLabel ?? block?.value}</Text><IconButton label="Remove block" icon="x" disabled={disabled} onPress={() => onAnswerChange({ placements: placements.filter((item) => item.blockId !== placement.blockId).map((item) => item.slotId === slot.id && item.position > placement.position ? { ...item, position: item.position - 1 } : item) })} /></View></DraggableRow>;
            })}</View> : <Text selectable style={styles.dropHint}>Drop blocks here</Text>}
          </View>
        );
      })}
    </View>
  );
}

function useCodePreview(files: CodeFile[]): { tree?: RenderNode; errors: string[] } {
  const [preview, setPreview] = useState<{ tree?: RenderNode; errors: string[] }>({ errors: [] });
  useEffect(() => {
    const timer = setTimeout(() => {
      const file = files.find((candidate) => candidate.editable !== false && candidate.language !== 'json');
      setPreview(file ? parseCodeToRenderTree(file.content, file.language) : { errors: ['No editable source file found.'] });
    }, 250);
    return () => clearTimeout(timer);
  }, [files]);
  return preview;
}

export function MiniChallengeQuestionScreen({ question, answer, disabled, onAnswerChange, customValidators = {} }: QuestionInteractionProps<MiniChallengeQuestion, MiniChallengeAnswer>) {
  const files = answer?.files ?? question.starterFiles;
  const preview = useCodePreview(files);
  const outcomes = validateChallengeRequirements(files, preview.tree, question.requirements, customValidators);
  return (
    <View style={styles.sectionGap}>
      <View style={styles.scenarioCard}><Lucide name="sparkles" size={20} color="#F28B19" /><Text selectable style={styles.scenarioText}>{question.scenario}</Text></View>
      <CodeFilesEditor files={files} disabled={disabled} onChange={(nextFiles) => onAnswerChange({ files: nextFiles })} />
      {preview.errors.length ? <View style={styles.errorCard}>{preview.errors.map((error) => <Text selectable key={error} style={styles.errorText}>{error}</Text>)}</View> : null}
      {question.previewEnabled ? <DevicePreview tree={preview.tree} /> : null}
      <RuleList outcomes={outcomes} />
    </View>
  );
}

export function GuessThreeThingsQuestionScreen({ question, answer, disabled, onAnswerChange }: QuestionInteractionProps<GuessThreeThingsQuestion, GuessThreeThingsAnswer>) {
  const options = useStableItems(question.options, question.shuffleOptions);
  const selected: string[] = answer?.selectedOptionIds ? [...answer.selectedOptionIds] : [];
  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((item) => item !== id) : selected.length < question.requiredSelections ? [...selected, id] : selected;
    if (next.length <= 3) onAnswerChange({ selectedOptionIds: next as GuessThreeThingsAnswer['selectedOptionIds'] });
  };
  return (
    <View style={styles.sectionGap}>
      <View accessibilityLabel={`${selected.length} of 3 selected`} accessibilityRole="progressbar" style={styles.threeProgress}>{[0, 1, 2].map((step) => <View key={step} style={[styles.threeStep, step < selected.length && styles.threeStepActive]} />)}</View>
      <View style={styles.chipGrid}>{options.map((option) => <Pressable key={option.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(option.id), disabled: disabled || (!selected.includes(option.id) && selected.length >= 3) }} disabled={disabled || (!selected.includes(option.id) && selected.length >= 3)} onPress={() => {
        feedback.play('buttonTap');
        toggle(option.id);
      }} style={[styles.guessChip, selected.includes(option.id) && styles.guessChipSelected]}><Text selectable style={[styles.guessText, selected.includes(option.id) && styles.guessTextSelected]}>{option.text}</Text></Pressable>)}</View>
    </View>
  );
}

export function BuildAndRenderQuestionScreen({ question, answer, disabled, onAnswerChange, customValidators = {} }: QuestionInteractionProps<BuildAndRenderQuestion, BuildAndRenderAnswer>) {
  const files = answer?.files ?? question.starterFiles;
  const preview = useCodePreview(files);
  const outcomes = validateRenderRules(files, preview.tree, question.validationRules, customValidators);
  return (
    <View style={styles.sectionGap}>
      <View style={styles.targetPreview}><DevicePreview tree={question.targetPreview} label="Target" /></View>
      <CodeFilesEditor files={files} disabled={disabled} onChange={(nextFiles) => onAnswerChange({ files: nextFiles, renderTree: preview.tree })} />
      {preview.errors.length ? <View style={styles.errorCard}>{preview.errors.map((error) => <Text selectable key={error} style={styles.errorText}>{error}</Text>)}</View> : null}
      <DevicePreview tree={preview.tree} label="Your preview" />
      <RuleList outcomes={outcomes} />
    </View>
  );
}

export function QuestionInteraction({ question, answer, disabled, initializationAttempt, onAnswerChange, customValidators }: { question: Question; answer?: QuestionAnswer; disabled?: boolean; initializationAttempt?: number; onAnswerChange: (answer: QuestionAnswer) => void; customValidators?: CustomValidatorRegistry }) {
  switch (question.type) {
    case 'multiple_choice': return <MultipleChoiceQuestionScreen question={question} answer={answer?.type === question.type ? answer.answer : undefined} disabled={disabled} onAnswerChange={(value) => onAnswerChange({ type: question.type, answer: value })} />;
    case 'multi_select': return <MultiSelectQuestionScreen question={question} answer={answer?.type === question.type ? answer.answer : undefined} disabled={disabled} onAnswerChange={(value) => onAnswerChange({ type: question.type, answer: value })} />;
    case 'true_false': return <TrueFalseQuestionScreen question={question} answer={answer?.type === question.type ? answer.answer : undefined} disabled={disabled} onAnswerChange={(value) => onAnswerChange({ type: question.type, answer: value })} />;
    case 'fill_in_the_blank': return <FillInTheBlankQuestionScreen question={question} answer={answer?.type === question.type ? answer.answer : undefined} disabled={disabled} onAnswerChange={(value) => onAnswerChange({ type: question.type, answer: value })} />;
    case 'match_pairs': return <MatchPairsQuestionScreen question={question} answer={answer?.type === question.type ? answer.answer : undefined} disabled={disabled} onAnswerChange={(value) => onAnswerChange({ type: question.type, answer: value })} />;
    case 'arrange_in_order': return <ArrangeInOrderQuestionScreen question={question} answer={answer?.type === question.type ? answer.answer : undefined} disabled={disabled} initializationAttempt={initializationAttempt} onAnswerChange={(value) => onAnswerChange({ type: question.type, answer: value })} />;
    case 'complete_code': return <CompleteCodeQuestionScreen question={question} answer={answer?.type === question.type ? answer.answer : undefined} disabled={disabled} onAnswerChange={(value) => onAnswerChange({ type: question.type, answer: value })} />;
    case 'find_error': return <FindErrorQuestionScreen question={question} answer={answer?.type === question.type ? answer.answer : undefined} disabled={disabled} onAnswerChange={(value) => onAnswerChange({ type: question.type, answer: value })} />;
    case 'predict_output': return <PredictOutputQuestionScreen question={question} answer={answer?.type === question.type ? answer.answer : undefined} disabled={disabled} onAnswerChange={(value) => onAnswerChange({ type: question.type, answer: value })} />;
    case 'identify_component': return <IdentifyComponentQuestionScreen question={question} answer={answer?.type === question.type ? answer.answer : undefined} disabled={disabled} onAnswerChange={(value) => onAnswerChange({ type: question.type, answer: value })} />;
    case 'drag_drop_builder': return <DragDropBuilderQuestionScreen question={question} answer={answer?.type === question.type ? answer.answer : undefined} disabled={disabled} onAnswerChange={(value) => onAnswerChange({ type: question.type, answer: value })} />;
    case 'mini_challenge': return <MiniChallengeQuestionScreen question={question} answer={answer?.type === question.type ? answer.answer : undefined} disabled={disabled} customValidators={customValidators} onAnswerChange={(value) => onAnswerChange({ type: question.type, answer: value })} />;
    case 'guess_three_things': return <GuessThreeThingsQuestionScreen question={question} answer={answer?.type === question.type ? answer.answer : undefined} disabled={disabled} onAnswerChange={(value) => onAnswerChange({ type: question.type, answer: value })} />;
    case 'build_and_render': return <BuildAndRenderQuestionScreen question={question} answer={answer?.type === question.type ? answer.answer : undefined} disabled={disabled} customValidators={customValidators} onAnswerChange={(value) => onAnswerChange({ type: question.type, answer: value })} />;
  }
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  horizontalOrder: { flexDirection: 'row', flexWrap: 'wrap' },
  sectionGap: { gap: 16 },
  counter: { color: QUESTION_COLORS.muted, fontSize: 13, fontWeight: '700', textAlign: 'right', fontVariant: ['tabular-nums'] },
  statementCard: { padding: 20, borderWidth: 1, borderColor: QUESTION_COLORS.border, borderRadius: 18, borderCurve: 'continuous', backgroundColor: '#F7F9FC' },
  statement: { color: QUESTION_COLORS.ink, fontSize: 18, fontWeight: '600', lineHeight: 27 },
  matchGrid: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  matchColumn: { flex: 1, gap: 10 },
  rowLabel: { color: QUESTION_COLORS.ink, fontSize: 15, fontWeight: '600' },
  orderNumber: { color: QUESTION_COLORS.green, fontWeight: '800', fontVariant: ['tabular-nums'] },
  miniCode: { color: '#475069', fontFamily: 'monospace', fontSize: 12.5 },
  helper: { color: QUESTION_COLORS.muted, fontSize: 14, lineHeight: 20 },
  correctionInput: { minHeight: 76, padding: 13, borderWidth: 1, borderColor: QUESTION_COLORS.border, borderRadius: 14, borderCurve: 'continuous', color: QUESTION_COLORS.ink, fontFamily: 'monospace', textAlignVertical: 'top' },
  answerInput: { minHeight: 52, paddingHorizontal: 15, borderWidth: 1.5, borderColor: QUESTION_COLORS.border, borderRadius: 14, borderCurve: 'continuous', color: QUESTION_COLORS.ink, fontSize: 16 },
  codeCardAlt: { gap: 2, padding: 10, borderRadius: 16, borderCurve: 'continuous', backgroundColor: '#F7F7FA' },
  tokenLine: { flexDirection: 'row', alignItems: 'flex-start' },
  tokenLineNumber: { width: 28, paddingTop: 5, color: '#A0A5B0', fontFamily: 'monospace', fontSize: 11, fontVariant: ['tabular-nums'] },
  tokenFlow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  token: { paddingHorizontal: 2, paddingVertical: 4, borderRadius: 5 },
  tokenActive: { backgroundColor: '#FFE4E8' },
  previewOptions: { gap: 14 },
  previewOption: { padding: 8, borderWidth: 2, borderColor: 'transparent', borderRadius: 24, borderCurve: 'continuous' },
  previewOptionSelected: { borderColor: QUESTION_COLORS.green, backgroundColor: QUESTION_COLORS.greenSoft },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  componentCard: { width: '48%', minHeight: 118, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 12, borderWidth: 1.5, borderColor: QUESTION_COLORS.border, borderRadius: 16, borderCurve: 'continuous', backgroundColor: '#FFFFFF' },
  componentCardSelected: { borderColor: QUESTION_COLORS.green, backgroundColor: QUESTION_COLORS.greenSoft },
  componentName: { color: QUESTION_COLORS.ink, fontFamily: 'monospace', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  chipTray: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, padding: 12, borderRadius: 16, borderCurve: 'continuous', backgroundColor: '#F6F1FF' },
  builderSlot: { minHeight: 130, gap: 10, padding: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: '#CFC3E9', borderRadius: 18, borderCurve: 'continuous', backgroundColor: '#FBFAFE' },
  slotAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderCurve: 'continuous', backgroundColor: '#F1EDF8' },
  slotActionReady: { backgroundColor: '#E9DDFB' },
  slotActionPressed: { opacity: 0.72 },
  slotActionText: { flex: 1, color: '#9A8DB3', fontSize: 12, fontWeight: '700', textAlign: 'right' },
  slotActionTextReady: { color: '#6D3CC5' },
  slotLabel: { color: '#7955AE', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  dropHint: { flex: 1, color: '#9A8DB3', fontSize: 14, textAlign: 'center', textAlignVertical: 'center' },
  placedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  scenarioCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 15, borderRadius: 15, borderCurve: 'continuous', backgroundColor: '#FFF5E9' },
  scenarioText: { flex: 1, color: QUESTION_COLORS.ink, fontSize: 14, fontWeight: '600', lineHeight: 21 },
  errorCard: { gap: 4, padding: 12, borderRadius: 12, borderCurve: 'continuous', backgroundColor: QUESTION_COLORS.redSoft },
  errorText: { color: QUESTION_COLORS.red, fontFamily: 'monospace', fontSize: 12, lineHeight: 17 },
  threeProgress: { height: 8, flexDirection: 'row', gap: 6 },
  threeStep: { flex: 1, borderRadius: 999, backgroundColor: '#E0E3E8' },
  threeStepActive: { backgroundColor: QUESTION_COLORS.green },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  guessChip: { minWidth: 92, paddingHorizontal: 16, paddingVertical: 13, borderWidth: 1.5, borderColor: QUESTION_COLORS.border, borderRadius: 13, borderCurve: 'continuous', backgroundColor: '#FFFFFF' },
  guessChipSelected: { borderColor: QUESTION_COLORS.green, backgroundColor: QUESTION_COLORS.greenSoft },
  guessText: { color: QUESTION_COLORS.ink, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  guessTextSelected: { color: '#187A35' },
  targetPreview: { padding: 12, borderRadius: 22, borderCurve: 'continuous', backgroundColor: '#EDF5FF' },
});
