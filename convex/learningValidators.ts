import { v } from 'convex/values';

export const exerciseTypeValidator = v.union(
  v.literal('multiple_choice'),
  v.literal('multi_select'),
  v.literal('true_false'),
  v.literal('fill_in_the_blank'),
  v.literal('match_pairs'),
  v.literal('arrange_in_order'),
  v.literal('complete_code'),
  v.literal('find_error'),
  v.literal('predict_output'),
  v.literal('identify_component'),
  v.literal('drag_drop_builder'),
  v.literal('mini_challenge'),
  v.literal('guess_three_things'),
  v.literal('build_and_render'),
);

const codeRangeValidator = v.object({
  startLine: v.number(),
  startColumn: v.optional(v.number()),
  endLine: v.optional(v.number()),
  endColumn: v.optional(v.number()),
});

const codeFileValidator = v.object({
  path: v.string(),
  content: v.string(),
  language: v.union(
    v.literal('javascript'),
    v.literal('typescript'),
    v.literal('jsx'),
    v.literal('tsx'),
    v.literal('json'),
  ),
  editable: v.optional(v.boolean()),
});

export const submittedAnswerValidator = v.union(
  v.object({
    type: v.literal('multiple_choice'),
    answer: v.object({ selectedOptionId: v.string() }),
  }),
  v.object({
    type: v.literal('multi_select'),
    answer: v.object({ selectedOptionIds: v.array(v.string()) }),
  }),
  v.object({
    type: v.literal('true_false'),
    answer: v.object({ value: v.boolean() }),
  }),
  v.object({
    type: v.literal('fill_in_the_blank'),
    answer: v.object({ values: v.record(v.string(), v.string()) }),
  }),
  v.object({
    type: v.literal('match_pairs'),
    answer: v.object({
      pairs: v.array(v.object({ leftId: v.string(), rightId: v.string() })),
    }),
  }),
  v.object({
    type: v.literal('arrange_in_order'),
    answer: v.object({ orderedItemIds: v.array(v.string()) }),
  }),
  v.object({
    type: v.literal('complete_code'),
    answer: v.object({
      values: v.record(v.string(), v.string()),
      completedCode: v.optional(v.string()),
    }),
  }),
  v.object({
    type: v.literal('find_error'),
    answer: v.object({
      selectedRanges: v.array(codeRangeValidator),
      correction: v.optional(v.string()),
    }),
  }),
  v.object({
    type: v.literal('predict_output'),
    answer: v.union(
      v.object({ mode: v.literal('multiple_choice'), selectedOptionId: v.string() }),
      v.object({ mode: v.literal('text'), value: v.string() }),
      v.object({ mode: v.literal('ui_preview'), renderTree: v.any() }),
    ),
  }),
  v.object({
    type: v.literal('identify_component'),
    answer: v.object({ selectedComponentId: v.string() }),
  }),
  v.object({
    type: v.literal('drag_drop_builder'),
    answer: v.object({
      placements: v.array(v.object({
        slotId: v.string(),
        blockId: v.string(),
        position: v.number(),
      })),
    }),
  }),
  v.object({
    type: v.literal('mini_challenge'),
    answer: v.object({ files: v.array(codeFileValidator) }),
  }),
  v.object({
    type: v.literal('guess_three_things'),
    answer: v.object({ selectedOptionIds: v.array(v.string()) }),
  }),
  v.object({
    type: v.literal('build_and_render'),
    answer: v.object({ files: v.array(codeFileValidator), renderTree: v.optional(v.any()) }),
  }),
);

export const contentStatusValidator = v.union(
  v.literal('draft'),
  v.literal('published'),
  v.literal('archived'),
);

export const attemptStatusValidator = v.union(
  v.literal('active'),
  v.literal('completed'),
  v.literal('abandoned'),
);

export const progressStatusValidator = v.union(
  v.literal('not_started'),
  v.literal('in_progress'),
  v.literal('completed'),
);
