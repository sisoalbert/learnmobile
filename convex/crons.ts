import { cronJobs, makeFunctionReference } from 'convex/server';

const crons = cronJobs();
const queueDueStreakReminders = makeFunctionReference<
  'mutation',
  Record<string, never>,
  null
>('streakReminders:queueDueStreakReminders');

crons.interval(
  'queue streak-at-risk reminders',
  { minutes: 30 },
  queueDueStreakReminders,
);

export default crons;
