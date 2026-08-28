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

/**
 * One-time content migration for the beginner counter exercise. It remains
 * restricted to authenticated administrators, so the answer key is never
 * accessible to learner clients.
 */
export const replaceBeginnerCounterChallenge = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const exercise = await ctx.db
      .query('exercises')
      .withIndex('by_key', (q) => q.eq('key', 'beginner-c4-l3-mini-001'))
      .unique();
    if (!exercise) throw new ConvexError({ code: 'EXERCISE_NOT_FOUND' });

    const lesson = await ctx.db.get(exercise.lessonId);
    if (lesson?.key !== 'beginner-course-4-lesson-3') {
      throw new ConvexError({ code: 'UNEXPECTED_LESSON' });
    }

    const solution = await ctx.db
      .query('exerciseSolutions')
      .withIndex('by_exercise', (q) => q.eq('exerciseId', exercise._id))
      .unique();
    if (!solution) throw new ConvexError({ code: 'SOLUTION_NOT_FOUND' });

    const question = {
      id: 'beginner-c4-l3-mini-001',
      type: 'multiple_choice' as const,
      title: 'Make the button increase the count',
      prompt: 'Complete the onPress handler for a reusable counter.',
      instruction: 'Choose the handler that updates React state when the button is pressed.',
      difficulty: 'beginner' as const,
      topic: 'Components, state, and events',
      tags: ['react', 'state', 'pressable'],
      xp: exercise.xp,
      estimatedSeconds: 45,
      hints: [{
        id: 'hint-1',
        text: 'Pressable needs a function. That function should call setCount with the next value.',
      }],
      explanation: {
        summary: 'Use an arrow function so setCount runs only after the press.',
        details: 'The handler receives no arguments here; it closes over count and calls setCount(count + 1) when the learner presses the button.',
        documentationUrl: 'https://react.dev/learn/adding-interactivity',
      },
      status: 'published' as const,
      version: 2,
      language: 'tsx' as const,
      codeSnippet: `<Pressable onPress={__________}>\n  <Text>Increase count</Text>\n</Pressable>`,
      options: [
        { id: 'increment', text: '() => setCount(count + 1)' },
        { id: 'run-now', text: 'setCount(count + 1)' },
        { id: 'no-update', text: '() => count + 1' },
      ],
    };
    const publicQuestion = question;
    const timestamp = Date.now();

    await ctx.db.patch(exercise._id, {
      type: 'multiple_choice',
      title: question.title,
      prompt: question.prompt,
      instruction: question.instruction,
      publicDataJson: JSON.stringify(publicQuestion),
      explanationJson: JSON.stringify(question.explanation),
      version: question.version,
      updatedAt: timestamp,
    });
    await ctx.db.patch(solution._id, {
      solutionDataJson: JSON.stringify({ ...question, correctOptionId: 'increment' }),
      updatedAt: timestamp,
    });

    return { exerciseKey: exercise.key, version: question.version };
  },
});

/**
 * One-time content migration that makes the About link challenge accessible
 * without requiring learners to type JSX on a mobile keyboard.
 */
export const replaceBeginnerAboutLinkChallenge = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const exercise = await ctx.db
      .query('exercises')
      .withIndex('by_key', (q) => q.eq('key', 'beginner-c5-l3-mini-001'))
      .unique();
    if (!exercise) throw new ConvexError({ code: 'EXERCISE_NOT_FOUND' });

    const lesson = await ctx.db.get(exercise.lessonId);
    if (lesson?.key !== 'beginner-course-5-lesson-3') {
      throw new ConvexError({ code: 'UNEXPECTED_LESSON' });
    }

    const solution = await ctx.db
      .query('exerciseSolutions')
      .withIndex('by_exercise', (q) => q.eq('exerciseId', exercise._id))
      .unique();
    if (!solution) throw new ConvexError({ code: 'SOLUTION_NOT_FOUND' });

    const question = {
      id: 'beginner-c5-l3-mini-001',
      type: 'multiple_choice' as const,
      title: 'Add an About link',
      prompt: 'Which JSX adds a visible link from the home page to /about?',
      instruction: 'Select the answer that correctly links to /about.',
      difficulty: 'beginner' as const,
      topic: 'Link navigation',
      tags: ['expo-router', 'link', 'navigation'],
      xp: exercise.xp,
      estimatedSeconds: 30,
      hints: [{
        id: 'hint-1',
        text: 'Use Link from expo-router. Its href is the route and its child text is the visible label.',
      }],
      explanation: {
        summary: 'Use Link with href="/about" and visible About text.',
        details: 'The app already has src/app/about.tsx, so <Link href="/about">About</Link> creates a visible route link from the home screen.',
        documentationUrl: 'https://docs.expo.dev/router/basics/navigation/',
      },
      status: 'published' as const,
      version: 2,
      language: 'tsx' as const,
      codeSnippet: `import { Link } from 'expo-router';

export default function Home() {
  return (
    <View>
      <Text>Home</Text>
      {/* Add the About link here */}
    </View>
  );
}`,
      options: [
        { id: 'about-link', text: 'Use Link with an href and label', code: '<Link href="/about">About</Link>' },
        { id: 'text-href', text: 'Use Text with an href', code: '<Text href="/about">About</Text>' },
        { id: 'link-to', text: 'Use Link with a to prop', code: '<Link to="/about">About</Link>' },
        { id: 'missing-label', text: 'Use Link without visible text', code: '<Link href="/about" />' },
      ],
    };
    const timestamp = Date.now();

    await ctx.db.patch(exercise._id, {
      type: 'multiple_choice',
      title: question.title,
      prompt: question.prompt,
      instruction: question.instruction,
      publicDataJson: JSON.stringify(question),
      explanationJson: JSON.stringify(question.explanation),
      version: question.version,
      updatedAt: timestamp,
    });
    await ctx.db.patch(solution._id, {
      solutionDataJson: JSON.stringify({ ...question, correctOptionId: 'about-link' }),
      updatedAt: timestamp,
    });

    return { exerciseKey: exercise.key, version: question.version };
  },
});
