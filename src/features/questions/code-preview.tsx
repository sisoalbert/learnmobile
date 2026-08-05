import { Image } from 'expo-image';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import type { RenderNode } from './questions.types';
import {
  parseCodeToRenderTree,
  renderTreesEqual,
  validateChallengeRequirements,
  validateRenderRules,
} from './code-preview-core';

export {
  parseCodeToRenderTree,
  renderTreesEqual,
  validateChallengeRequirements,
  validateRenderRules,
};
export type { CodePreviewResult } from './code-preview-core';

function renderNode(node: RenderNode, key: string): React.ReactNode {
  const style = node.style as StyleProp<ViewStyle>;
  const children = (node.children ?? []).map((child, index) => renderNode(child, `${key}-${index}`));
  if (node.component === 'Text') return <Text key={key} selectable style={node.style as never}>{node.text}{children}</Text>;
  if (node.component === 'Image') {
    const source = typeof node.props?.source === 'string'
      ? { uri: node.props.source }
      : typeof (node.props?.source as { uri?: unknown } | undefined)?.uri === 'string'
        ? { uri: (node.props?.source as { uri: string }).uri }
        : undefined;
    return source ? <Image key={key} source={source} style={node.style as never} contentFit="contain" /> : null;
  }
  if (node.component === 'TextInput') return <TextInput key={key} editable={false} placeholder={String(node.props?.placeholder ?? '')} style={node.style as never} />;
  if (node.component === 'Pressable') return <Pressable key={key} accessibilityRole="button" style={style}><Text selectable>{node.text}</Text>{children}</Pressable>;
  if (node.component === 'ScrollView') return <ScrollView key={key} style={style}>{node.text ? <Text selectable>{node.text}</Text> : null}{children}</ScrollView>;
  return <View key={key} style={style}>{node.text ? <Text selectable>{node.text}</Text> : null}{children}</View>;
}

export function RenderNodePreview({ tree }: { tree?: RenderNode }) {
  if (!tree) {
    return <View style={styles.empty}><Text selectable style={styles.emptyText}>Your preview will appear here.</Text></View>;
  }
  return <View style={styles.preview}>{renderNode(tree, tree.id ?? 'root')}</View>;
}

const styles = StyleSheet.create({
  preview: { flex: 1, minHeight: 220, overflow: 'hidden', borderRadius: 20, borderCurve: 'continuous', backgroundColor: '#FFFFFF' },
  empty: { minHeight: 220, alignItems: 'center', justifyContent: 'center', padding: 24, borderRadius: 20, borderCurve: 'continuous', backgroundColor: '#F5F7FA' },
  emptyText: { color: '#777E8C', textAlign: 'center' },
});
