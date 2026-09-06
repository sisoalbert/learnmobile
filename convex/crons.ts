import { cronJobs, makeFunctionReference } from 'convex/server';

const crons = cronJobs();
const queueDueStreakReminders = makeFunctionReference<
  'mutation',
  Record<string, never>,
  null
>('streakReminders:queueDueStreakReminders');
const queueDueStreakPushReminders = makeFunctionReference<
  'mutation',
  Record<string, never>,
  null
>('streakReminders:queueDueStreakPushReminders');

crons.interval(
  'queue streak-at-risk reminders',
  { minutes: 15 },
  queueDueStreakReminders,
);
crons.interval(
  'queue streak-at-risk push reminders',
  { minutes: 15 },
  queueDueStreakPushReminders,
);

export default crons;
