export const STREAK_REMINDER_TEMPLATES = [
  {
    id: 'streak_reminder_05',
    subject: 'Don’t let that streak disappear 🔥',
    body: "You've already put in the work to build your streak. Complete today's Learn Expo lesson before the day ends to keep it going.",
    cta: 'SAVE MY STREAK',
  },
  {
    id: 'streak_reminder_07',
    subject: '⏳ Your streak is running out of time',
    body: "The day is almost over and today's lesson is still incomplete. Jump into Learn Expo now and protect your streak.",
    cta: 'SAVE MY STREAK',
  },
  {
    id: 'streak_reminder_10',
    subject: 'Last call for today’s streak 🔥',
    body: 'This is your final reminder for today. Complete one Learn Expo lesson before the day ends and keep your streak alive.',
    cta: 'START A LESSON',
  },
] as const;

export function streakReminderTemplate(variantIndex: number) {
  return STREAK_REMINDER_TEMPLATES[Math.abs(variantIndex) % STREAK_REMINDER_TEMPLATES.length];
}

export function nextStreakReminderVariant(variantIndex: number) {
  return (Math.abs(variantIndex) + 1) % STREAK_REMINDER_TEMPLATES.length;
}

export function streakReminderIdempotencyKey(userId: string, localDate: string) {
  return `streak-reminder/${userId}/${localDate}`;
}
