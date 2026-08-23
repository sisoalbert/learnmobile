import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { requireAdmin } from './authz';
import { contentStatusValidator } from './learningValidators';

export const listCourses = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const courses = await ctx.db.query('courses').order('asc').collect();

    return await Promise.all(courses.map(async (course) => {
      const units = await ctx.db
        .query('units')
        .withIndex('by_course_order', (q) => q.eq('courseId', course._id))
        .collect();
      const unitsWithLessonCounts = await Promise.all(units.map(async (unit) => {
        const lessons = await ctx.db
          .query('lessons')
          .withIndex('by_unit_order', (q) => q.eq('unitId', unit._id))
          .collect();
        return {
          id: unit._id,
          key: unit.key,
          title: unit.title,
          status: unit.status,
          lessonCount: lessons.length,
          lessons: lessons.map((lesson) => ({
            id: lesson._id,
            key: lesson.key,
            title: lesson.title,
            status: lesson.status,
            order: lesson.order,
          })),
        };
      }));

      return {
        id: course._id,
        key: course.key,
        title: course.title,
        description: course.description,
        status: course.status,
        units: unitsWithLessonCounts,
      };
    }));
  },
});

export const getLessonDetails = query({
  args: { lessonKey: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const lesson = await ctx.db.query('lessons').withIndex('by_key', (q) => q.eq('key', args.lessonKey)).unique();
    if (!lesson) return null;
    const unit = await ctx.db.get(lesson.unitId);
    if (!unit) return null;
    const course = await ctx.db.get(unit.courseId);
    if (!course) return null;
    const exercises = await ctx.db
      .query('exercises')
      .withIndex('by_lesson_order', (q) => q.eq('lessonId', lesson._id))
      .collect();

    return {
      id: lesson._id,
      key: lesson.key,
      title: lesson.title,
      description: lesson.description,
      order: lesson.order,
      xpReward: lesson.xpReward,
      minimumPassingScore: lesson.minimumPassingScore,
      status: lesson.status,
      course: { key: course.key, title: course.title },
      unit: { key: unit.key, title: unit.title },
      exercises: await Promise.all(exercises.map(async (exercise) => {
        const solution = await ctx.db
          .query('exerciseSolutions')
          .withIndex('by_exercise', (q) => q.eq('exerciseId', exercise._id))
          .unique();
        return {
          id: exercise._id,
          key: exercise.key,
          type: exercise.type,
          title: exercise.title,
          prompt: exercise.prompt,
          instruction: exercise.instruction,
          xp: exercise.xp,
          status: exercise.status,
          question: JSON.parse(exercise.publicDataJson) as Record<string, unknown>,
          answer: solution ? JSON.parse(solution.solutionDataJson) as Record<string, unknown> : null,
        };
      })),
    };
  },
});

export const createLesson = mutation({
  args: {
    unitId: v.id('units'),
    key: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    xpReward: v.number(),
    minimumPassingScore: v.number(),
    status: contentStatusValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const key = args.key.trim();
    const title = args.title.trim();
    if (!key || !title) throw new ConvexError({ code: 'INVALID_LESSON', message: 'A lesson key and title are required.' });
    if (args.xpReward < 0) throw new ConvexError({ code: 'INVALID_LESSON', message: 'XP reward cannot be negative.' });
    if (args.minimumPassingScore < 0 || args.minimumPassingScore > 1) {
      throw new ConvexError({ code: 'INVALID_LESSON', message: 'Minimum passing score must be between 0 and 1.' });
    }

    const unit = await ctx.db.get(args.unitId);
    if (!unit) throw new ConvexError({ code: 'UNIT_NOT_FOUND' });
    const existing = await ctx.db.query('lessons').withIndex('by_key', (q) => q.eq('key', key)).unique();
    if (existing) throw new ConvexError({ code: 'LESSON_KEY_EXISTS', message: 'That lesson key is already in use.' });

    const existingLessons = await ctx.db
      .query('lessons')
      .withIndex('by_unit_order', (q) => q.eq('unitId', unit._id))
      .collect();
    const timestamp = Date.now();
    const lessonId = await ctx.db.insert('lessons', {
      key,
      unitId: unit._id,
      title,
      description: args.description?.trim() || undefined,
      order: existingLessons.length,
      xpReward: args.xpReward,
      minimumPassingScore: args.minimumPassingScore,
      status: args.status,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return { lessonId, key };
  },
});
