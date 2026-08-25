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
  { minutes: 60 },
  queueDueStreakReminders,
);
crons.interval(
  'queue streak-at-risk push reminders',
  { minutes: 60 },
  queueDueStreakPushReminders,
);

export default crons;
