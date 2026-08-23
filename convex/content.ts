import { v } from 'convex/values';

import { query, type MutationCtx, type QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';

async function courseByKey(ctx: QueryCtx | MutationCtx, key: string) {
  return await ctx.db.query('courses').withIndex('by_key', (q) => q.eq('key', key)).unique();
}

async function lessonByKey(ctx: QueryCtx | MutationCtx, key: string) {
  return await ctx.db.query('lessons').withIndex('by_key', (q) => q.eq('key', key)).unique();
}

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
