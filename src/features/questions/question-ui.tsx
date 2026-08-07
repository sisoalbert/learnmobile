/* eslint-disable react-hooks/immutability -- Reanimated SharedValues are intentionally mutated in UI-thread gesture callbacks. */
import { Lucide, type LucideIconName } from '@react-native-vector-icons/lucide';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { feedback } from '@/services/feedback';
import { RenderNodePreview } from './code-preview';
import { QUESTION_COLORS } from './question-constants';
import type { CodeFile, RenderNode, RuleOutcome } from './questions.types';

export function SelectionCard({
  label,
  detail,
  selected,
  multiple = false,
  disabled,
  onPress,
  style,
}: {
  label: string;
  detail?: string;
  selected: boolean;
  multiple?: boolean;
  disabled?: boolean;
  onPress: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={() => {
        feedback.play('buttonTap');
        onPress();
      }}
      style={({ pressed }) => [styles.selectionCard, selected && styles.selectionCardSelected, pressed && styles.pressed, style]}
    >
      <View style={[styles.selectionControl, multiple && styles.checkbox, selected && styles.selectionControlSelected]}>
        {selected ? <Lucide name="check" size={14} color="#FFFFFF" /> : null}
      </View>
      <View style={styles.selectionCopy}>
        <Text selectable style={[styles.selectionLabel, selected && styles.selectionLabelSelected]}>{label}</Text>
        {detail ? <Text selectable style={styles.selectionDetail}>{detail}</Text> : null}
      </View>
    </Pressable>
  );
}

export function CodeCard({ code, selectedLines = [], onLinePress }: { code: string; selectedLines?: number[]; onLinePress?: (line: number) => void }) {
  return (
    <View style={styles.codeCard}>
      {code.split('\n').map((line, index) => {
        const lineNumber = index + 1;
        const selected = selectedLines.includes(lineNumber);
        const content = (
          <View style={[styles.codeLine, selected && styles.codeLineSelected]}>
            <Text selectable style={styles.lineNumber}>{lineNumber}</Text>
            <Text selectable style={[styles.codeText, selected && styles.codeTextSelected]}>{line || ' '}</Text>
          </View>
        );
        return onLinePress ? (
          <Pressable key={lineNumber} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => {
            feedback.play('buttonTap');
            onLinePress(lineNumber);
          }}>
            {content}
          </Pressable>
        ) : <React.Fragment key={lineNumber}>{content}</React.Fragment>;
      })}
    </View>
  );
}

export type TemplateSegment =
  | { type: 'text'; value: string }
  | { type: 'blank'; id: string };

export function parseTemplateLines(template: string): TemplateSegment[][] {
  return template.split(/\r?\n/).map((line) =>
    line
      .split(/(\{\{[^}\n]+\}\})/g)
      .filter(Boolean)
      .map((part): TemplateSegment => {
        const match = /^\{\{(.+)\}\}$/.exec(part);
        return match ? { type: 'blank', id: match[1] } : { type: 'text', value: part };
      }),
  );
}

function getBlankWidth(value: string, placeholder: string): number {
  const characterCount = Math.max(value.length, placeholder.length, 8);
  return Math.min(240, characterCount * 9 + 20);
}

export function TemplateFields({
  template,
  fields,
  values,
  disabled,
  onChange,
}: {
  template: string;
  fields: { id: string; placeholder?: string }[];
  values: Record<string, string>;
  disabled?: boolean;
  onChange: (values: Record<string, string>) => void;
}) {
  const lines = useMemo(() => parseTemplateLines(template), [template]);
  return (
    <View style={styles.templateCard}>
      <ScrollView
        horizontal
        contentContainerStyle={styles.templateContent}
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.templateLines}>
          {lines.map((segments, lineIndex) => (
            <View key={`line-${lineIndex}`} style={styles.templateLine}>
              {segments.length === 0 ? <Text style={styles.codeText}> </Text> : null}
              {segments.map((segment, segmentIndex) => {
                if (segment.type === 'text') {
                  return <Text selectable key={`text-${lineIndex}-${segmentIndex}`} style={styles.codeText}>{segment.value}</Text>;
                }
                const field = fields.find((candidate) => candidate.id === segment.id);
                const placeholder = field?.placeholder ?? segment.id;
                const value = values[segment.id] ?? '';
                return (
                  <TextInput
                    key={`blank-${lineIndex}-${segmentIndex}-${segment.id}`}
                    accessibilityLabel={`Answer for ${placeholder}`}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!disabled}
                    multiline={false}
                    value={value}
                    placeholder={placeholder}
                    placeholderTextColor="#A0A5B0"
                    selectTextOnFocus
                    spellCheck={false}
                    onChangeText={(nextValue) => onChange({ ...values, [segment.id]: nextValue })}
                    style={[styles.inlineInput, { width: getBlankWidth(value, placeholder) }]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export function DraggableRow({
  children,
  index,
  count,
  direction = 'vertical',
  disabled,
  onMove,
}: React.PropsWithChildren<{ index: number; count: number; direction?: 'vertical' | 'horizontal'; disabled?: boolean; onMove: (from: number, to: number) => void }>) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const moveByGesture = useCallback((translation: number) => {
    const delta = Math.round(translation / 58);
    const target = Math.max(0, Math.min(count - 1, index + delta));
    if (target !== index) onMove(index, target);
  }, [count, index, onMove]);
  const gesture = useMemo(() => Gesture.Pan()
    .enabled(!disabled)
    .activateAfterLongPress(180)
    .onStart(() => { scale.value = withSpring(1.03); })
    .onUpdate((event) => {
      if (direction === 'horizontal') translateX.value = event.translationX;
      else translateY.value = event.translationY;
    })
    .onEnd((event) => { scheduleOnRN(moveByGesture, direction === 'horizontal' ? event.translationX : event.translationY); })
    .onFinalize(() => {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
    }), [direction, disabled, moveByGesture, scale, translateX, translateY]);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }], zIndex: translateX.value === 0 && translateY.value === 0 ? 0 : 20 }));

  return (
    <GestureDetector gesture={gesture} touchAction="pan-y">
      <Animated.View style={[styles.draggableRow, animatedStyle]}>
        <Lucide name="grip-vertical" size={20} color="#A0A5B0" />
        <View style={styles.draggableContent}>{children}</View>
        <View style={styles.moveActions}>
          <IconButton label="Move up" icon="chevron-up" disabled={disabled || index === 0} onPress={() => onMove(index, index - 1)} />
          <IconButton label="Move down" icon="chevron-down" disabled={disabled || index === count - 1} onPress={() => onMove(index, index + 1)} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

export function DraggableChip({
  label,
  disabled,
  selected,
  onPress,
  onDrop,
}: {
  label: string;
  disabled?: boolean;
  selected?: boolean;
  onPress: () => void;
  onDrop: (absoluteX: number, absoluteY: number) => void;
}) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const gesture = useMemo(() => Gesture.Pan()
    .enabled(!disabled)
    .activateAfterLongPress(160)
    .onUpdate((event) => { x.value = event.translationX; y.value = event.translationY; })
    .onEnd((event) => { scheduleOnRN(onDrop, event.absoluteX, event.absoluteY); })
    .onFinalize(() => { x.value = withSpring(0); y.value = withSpring(0); }), [disabled, onDrop, x, y]);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: y.value }], zIndex: x.value === 0 && y.value === 0 ? 0 : 30 }));
  return (
    <GestureDetector gesture={gesture} touchAction="pan-y">
      <Animated.View style={animatedStyle}>
        <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={() => {
          feedback.play('buttonTap');
          onPress();
        }} style={[styles.chip, selected && styles.chipSelected]}>
          <Text selectable style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

export function IconButton({ label, icon, disabled, onPress }: { label: string; icon: LucideIconName; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} hitSlop={6} onPress={() => {
      feedback.play('buttonTap');
      onPress();
    }} style={({ pressed }) => [styles.iconButton, disabled && styles.iconButtonDisabled, pressed && styles.pressed]}>
      <Lucide name={icon} size={17} color={disabled ? '#C5C8CF' : QUESTION_COLORS.muted} />
    </Pressable>
  );
}

export function CodeFilesEditor({ files, disabled, onChange }: { files: CodeFile[]; disabled?: boolean; onChange: (files: CodeFile[]) => void }) {
  const editableFiles = files.filter((file) => file.editable !== false);
  const [activePath, setActivePath] = useState(editableFiles[0]?.path ?? files[0]?.path ?? '');
  const active = files.find((file) => file.path === activePath) ?? editableFiles[0] ?? files[0];
  if (!active) return null;
  return (
    <View style={styles.editorCard}>
      {files.length > 1 ? (
        <View style={styles.fileTabs}>
          {files.map((file) => (
            <Pressable key={file.path} accessibilityRole="tab" accessibilityState={{ selected: file.path === active.path }} onPress={() => {
              feedback.play('buttonTap');
              setActivePath(file.path);
            }} style={[styles.fileTab, file.path === active.path && styles.fileTabActive]}>
              <Text selectable style={[styles.fileTabText, file.path === active.path && styles.fileTabTextActive]}>{file.path}</Text>
            </Pressable>
          ))}
        </View>
      ) : <Text selectable style={styles.fileName}>{active.path}</Text>}
      <TextInput
        accessibilityLabel={`Code editor for ${active.path}`}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!disabled && active.editable !== false}
        multiline
        onChangeText={(content) => onChange(files.map((file) => file.path === active.path ? { ...file, content } : file))}
        scrollEnabled
        selectionColor={QUESTION_COLORS.blue}
        spellCheck={false}
        textAlignVertical="top"
        value={active.content}
        style={styles.editor}
      />
    </View>
  );
}

export function DevicePreview({ tree, label = 'Preview' }: { tree?: RenderNode; label?: string }) {
  return (
    <View style={styles.previewGroup}>
      <Text selectable style={styles.previewLabel}>{label}</Text>
      <View style={styles.deviceFrame}>
        <View style={styles.deviceNotch} />
        <RenderNodePreview tree={tree} />
      </View>
    </View>
  );
}

export function RuleList({ outcomes }: { outcomes: RuleOutcome[] }) {
  return (
    <View style={styles.ruleList}>
      {outcomes.map((item) => (
        <View key={item.id} style={styles.ruleRow}>
          <Lucide name={item.passed ? 'circle-check' : 'circle'} size={18} color={item.passed ? QUESTION_COLORS.green : '#B4B8C0'} />
          <View style={styles.ruleCopy}>
            <Text selectable style={styles.ruleText}>{item.description}</Text>
            {item.error ? <Text selectable style={styles.ruleError}>{item.error}</Text> : null}
          </View>
          <Text selectable style={styles.rulePoints}>{item.pointsAwarded}/{item.pointsAvailable}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  selectionCard: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1.5, borderColor: QUESTION_COLORS.border, borderRadius: 16, borderCurve: 'continuous', backgroundColor: QUESTION_COLORS.surface },
  selectionCardSelected: { borderColor: QUESTION_COLORS.green, backgroundColor: QUESTION_COLORS.greenSoft },
  selectionControl: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#C9CDD5', borderRadius: 11 },
  checkbox: { borderRadius: 5 },
  selectionControlSelected: { borderColor: QUESTION_COLORS.green, backgroundColor: QUESTION_COLORS.green },
  selectionCopy: { flex: 1, gap: 3 },
  selectionLabel: { color: QUESTION_COLORS.ink, fontSize: 16, fontWeight: '600' },
  selectionLabelSelected: { color: '#187A35' },
  selectionDetail: { color: QUESTION_COLORS.muted, fontSize: 13 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  codeCard: { overflow: 'hidden', borderWidth: 1, borderColor: QUESTION_COLORS.border, borderRadius: 16, borderCurve: 'continuous', backgroundColor: QUESTION_COLORS.code },
  codeLine: { minHeight: 25, flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 3 },
  codeLineSelected: { backgroundColor: '#FFE4E8' },
  lineNumber: { width: 30, color: '#A0A5B0', fontFamily: 'monospace', fontSize: 12, fontVariant: ['tabular-nums'] },
  codeText: { color: '#31394C', fontFamily: 'monospace', fontSize: 13, lineHeight: 19 },
  codeTextSelected: { color: '#B42338' },
  templateCard: { overflow: 'hidden', borderWidth: 1, borderColor: QUESTION_COLORS.border, borderRadius: 16, borderCurve: 'continuous', backgroundColor: QUESTION_COLORS.code },
  templateContent: { minWidth: '100%', paddingHorizontal: 16, paddingVertical: 14 },
  templateLines: { alignItems: 'flex-start' },
  templateLine: { minHeight: 27, flexDirection: 'row', alignItems: 'center' },
  inlineInput: { height: 27, marginHorizontal: 2, paddingHorizontal: 6, paddingVertical: 0, borderBottomWidth: 2, borderBottomColor: '#8757D8', color: '#6D3CC5', fontFamily: 'monospace', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  draggableRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderWidth: 1, borderColor: QUESTION_COLORS.border, borderRadius: 14, borderCurve: 'continuous', backgroundColor: QUESTION_COLORS.surface, boxShadow: '0 2px 8px rgba(23,33,59,0.06)' },
  draggableContent: { flex: 1 },
  moveActions: { flexDirection: 'row', gap: 3 },
  iconButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#F0F2F5' },
  iconButtonDisabled: { opacity: 0.45 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderColor: '#D8DCE4', borderRadius: 12, borderCurve: 'continuous', backgroundColor: '#FFFFFF' },
  chipSelected: { borderColor: '#8757D8', backgroundColor: '#F5F0FF' },
  chipText: { color: QUESTION_COLORS.ink, fontFamily: 'monospace', fontSize: 14, fontWeight: '600' },
  chipTextSelected: { color: '#6D3CC5' },
  editorCard: { overflow: 'hidden', borderWidth: 1, borderColor: QUESTION_COLORS.border, borderRadius: 16, borderCurve: 'continuous', backgroundColor: '#181C26' },
  fileTabs: { flexDirection: 'row', gap: 4, paddingHorizontal: 10, paddingTop: 8, backgroundColor: '#252A36' },
  fileTab: { paddingHorizontal: 10, paddingVertical: 8, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  fileTabActive: { backgroundColor: '#181C26' },
  fileTabText: { color: '#AEB5C5', fontSize: 12 },
  fileTabTextActive: { color: '#FFFFFF' },
  fileName: { paddingHorizontal: 14, paddingVertical: 10, color: '#C7CEDD', fontSize: 12, fontWeight: '700', backgroundColor: '#252A36' },
  editor: { minHeight: 270, maxHeight: 420, padding: 14, color: '#E8ECF5', fontFamily: 'monospace', fontSize: 12.5, lineHeight: 19 },
  previewGroup: { gap: 8 },
  previewLabel: { color: QUESTION_COLORS.ink, fontSize: 13, fontWeight: '700' },
  deviceFrame: { minHeight: 260, padding: 10, paddingTop: 25, overflow: 'hidden', borderWidth: 5, borderColor: '#31343A', borderRadius: 30, borderCurve: 'continuous', backgroundColor: '#FFFFFF', boxShadow: '0 8px 24px rgba(23,33,59,0.12)' },
  deviceNotch: { position: 'absolute', top: 7, width: 58, height: 8, alignSelf: 'center', borderRadius: 999, backgroundColor: '#31343A' },
  ruleList: { gap: 8 },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 11, borderRadius: 12, borderCurve: 'continuous', backgroundColor: '#F6F7F9' },
  ruleCopy: { flex: 1, gap: 2 },
  ruleText: { color: QUESTION_COLORS.ink, fontSize: 13, fontWeight: '600' },
  ruleError: { color: QUESTION_COLORS.red, fontSize: 12 },
  rulePoints: { color: QUESTION_COLORS.muted, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
