import { v } from 'convex/values';

import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { COURSE_SEEDS, numericSuffix, optionGroups, publicQuestion, QUESTION_SEEDS } from './contentSeed';
import type { Id } from './_generated/dataModel';

const now = () => Date.now();

async function courseByKey(ctx: QueryCtx | MutationCtx, key: string) {
  return await ctx.db.query('courses').withIndex('by_key', (q) => q.eq('key', key)).unique();
}

async function lessonByKey(ctx: QueryCtx | MutationCtx, key: string) {
  return await ctx.db.query('lessons').withIndex('by_key', (q) => q.eq('key', key)).unique();
}

export const ensureSeeded = mutation({
  args: {},
  handler: async (ctx) => {
    const timestamp = now();
    let inserted = 0;
    let updated = 0;

    for (const [courseOrder, seed] of COURSE_SEEDS.entries()) {
      const existingCourse = await courseByKey(ctx, seed.key);
      const courseData = {
        title: seed.title,
        description: seed.description,
        kind: 'technology' as const,
        contentLanguage: 'en',
        subject: seed.subject,
        order: courseOrder,
        status: 'published' as const,
        contentVersion: 1,
        publishedAt: timestamp,
        updatedAt: timestamp,
      };
      const courseId = existingCourse
        ? (await ctx.db.patch(existingCourse._id, courseData), existingCourse._id)
        : await ctx.db.insert('courses', { key: seed.key, createdAt: timestamp, ...courseData });
      existingCourse ? updated += 1 : inserted += 1;

      const unitKey = `${seed.key}-core`;
      const existingUnit = await ctx.db.query('units').withIndex('by_key', (q) => q.eq('key', unitKey)).unique();
      const unitData = {
        courseId,
        title: 'Core lessons',
        description: `The essential ${seed.title} learning sequence.`,
        order: 0,
        status: 'published' as const,
        updatedAt: timestamp,
      };
      const unitId = existingUnit
        ? (await ctx.db.patch(existingUnit._id, unitData), existingUnit._id)
        : await ctx.db.insert('units', { key: unitKey, createdAt: timestamp, ...unitData });

      const courseQuestions = QUESTION_SEEDS.filter((question) => question.courseId === seed.key);
      const lessonKeys = [...new Set(courseQuestions.map((question) => question.lessonId))]
        .sort((left, right) => numericSuffix(left) - numericSuffix(right));

      for (const [lessonOrder, lessonKey] of lessonKeys.entries()) {
        const questions = courseQuestions.filter((question) => question.lessonId === lessonKey);
        const existingLesson = await lessonByKey(ctx, lessonKey);
        const lessonData = {
          unitId,
          title: questions[0]?.title ?? `Lesson ${lessonOrder + 1}`,
          description: questions[0]?.prompt,
          order: lessonOrder,
          xpReward: questions.reduce((total, question) => total + question.xp, 0),
          minimumPassingScore: 0.7,
          status: 'published' as const,
          updatedAt: timestamp,
        };
        const lessonId = existingLesson
          ? (await ctx.db.patch(existingLesson._id, lessonData), existingLesson._id)
          : await ctx.db.insert('lessons', { key: lessonKey, createdAt: timestamp, ...lessonData });

        for (const [exerciseOrder, question] of questions.entries()) {
          const existingExercise = await ctx.db
            .query('exercises')
            .withIndex('by_key', (q) => q.eq('key', question.id))
            .unique();
          const exerciseData = {
            lessonId,
            type: question.type as never,
            title: question.title,
            prompt: question.prompt,
            instruction: typeof question.instruction === 'string' ? question.instruction : undefined,
            publicDataJson: JSON.stringify(publicQuestion(question)),
            explanationJson: question.explanation ? JSON.stringify(question.explanation) : undefined,
            xp: question.xp,
            order: exerciseOrder,
            version: question.version,
            status: question.status,
            updatedAt: timestamp,
          };
          const exerciseId = existingExercise
            ? (await ctx.db.patch(existingExercise._id, exerciseData), existingExercise._id)
            : await ctx.db.insert('exercises', { key: question.id, createdAt: timestamp, ...exerciseData });

          const existingSolution = await ctx.db
            .query('exerciseSolutions')
            .withIndex('by_exercise', (q) => q.eq('exerciseId', exerciseId))
            .unique();
          const solutionData = { solutionDataJson: JSON.stringify(question), updatedAt: timestamp };
          if (existingSolution) await ctx.db.patch(existingSolution._id, solutionData);
          else await ctx.db.insert('exerciseSolutions', { exerciseId, createdAt: timestamp, ...solutionData });

          const oldOptions = await ctx.db
            .query('exerciseOptions')
            .withIndex('by_exercise_group_order', (q) => q.eq('exerciseId', exerciseId))
            .collect();
          for (const option of oldOptions) await ctx.db.delete(option._id);
          for (const option of optionGroups(question)) {
            await ctx.db.insert('exerciseOptions', { exerciseId, ...option });
          }
        }
      }
    }

    return { courses: COURSE_SEEDS.length, exercises: QUESTION_SEEDS.length, inserted, updated };
  },
});

export const listPublishedCourses = query({
  args: {},
  handler: async (ctx) => {
    const courses = await ctx.db
      .query('courses')
      .withIndex('by_status_order', (q) => q.eq('status', 'published'))
      .collect();

    return await Promise.all(courses.map(async (course) => {
      const units = await ctx.db
        .query('units')
        .withIndex('by_course_order', (q) => q.eq('courseId', course._id))
        .collect();
      const lessonGroups = await Promise.all(units.map((unit) => ctx.db
        .query('lessons')
        .withIndex('by_unit_status_order', (q) => q.eq('unitId', unit._id).eq('status', 'published'))
        .collect()));
      const lessons = lessonGroups.flat();
      const exerciseGroups = await Promise.all(lessons.map((lesson) => ctx.db
        .query('exercises')
        .withIndex('by_lesson_status_order', (q) => q.eq('lessonId', lesson._id).eq('status', 'published'))
        .collect()));

      return {
        id: course._id,
        key: course.key,
        title: course.title,
        description: course.description,
        subject: course.subject,
        iconUrl: course.iconUrl,
        order: course.order,
        unitCount: units.length,
        lessonCount: lessons.length,
        exerciseCount: exerciseGroups.reduce((total, exercises) => total + exercises.length, 0),
      };
    }));
  },
});

export const getCoursePath = query({
  args: { courseKey: v.string() },
  handler: async (ctx, { courseKey }) => {
    const course = await courseByKey(ctx, courseKey);
    if (!course || course.status !== 'published') return null;
    const units = await ctx.db
      .query('units')
      .withIndex('by_course_order', (q) => q.eq('courseId', course._id))
      .collect();

    return {
      id: course._id,
      key: course.key,
      title: course.title,
      description: course.description,
      units: await Promise.all(units.filter((unit) => unit.status === 'published').map(async (unit) => ({
        id: unit._id,
        key: unit.key,
        title: unit.title,
        order: unit.order,
        lessons: (await ctx.db
          .query('lessons')
          .withIndex('by_unit_status_order', (q) => q.eq('unitId', unit._id).eq('status', 'published'))
          .collect())
          .map((lesson) => ({
            id: lesson._id,
            key: lesson.key,
            title: lesson.title,
            description: lesson.description,
            order: lesson.order,
            xpReward: lesson.xpReward,
          })),
      }))),
    };
  },
});

export const getLesson = query({
  args: { lessonKey: v.string() },
  handler: async (ctx, { lessonKey }) => {
    const lesson = await lessonByKey(ctx, lessonKey);
    if (!lesson || lesson.status !== 'published') return null;
    const exercises = await ctx.db
      .query('exercises')
      .withIndex('by_lesson_status_order', (q) => q.eq('lessonId', lesson._id).eq('status', 'published'))
      .collect();

    return {
      id: lesson._id,
      key: lesson.key,
      title: lesson.title,
      xpReward: lesson.xpReward,
      exercises: exercises.map((exercise) => ({
        id: exercise._id,
        key: exercise.key,
        type: exercise.type,
        xp: exercise.xp,
        order: exercise.order,
        question: JSON.parse(exercise.publicDataJson) as Record<string, unknown>,
      })),
    };
  },
});

export async function getLessonCourse(
  ctx: QueryCtx | MutationCtx,
  lessonId: Id<'lessons'>,
) {
  const lesson = await ctx.db.get(lessonId);
  if (!lesson) return null;
  const unit = await ctx.db.get(lesson.unitId);
  if (!unit) return null;
  const course = await ctx.db.get(unit.courseId);
  return course ? { lesson, unit, course } : null;
}
