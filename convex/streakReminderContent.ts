export const STREAK_REMINDER_TEMPLATES = [
  {
    id: 'streak_freeze_day_1',
    subject: 'Your streak is protected tonight 🔥',
    body: 'Missed today? We’ll freeze your streak, but only for up to 3 days. Complete a lesson to keep moving.',
    cta: 'SAVE MY STREAK',
  },
  {
    id: 'streak_freeze_day_2',
    subject: 'Your streak is frozen — 2 days left ❄️',
    body: 'Your progress is safe for now. Come back today to restart your momentum.',
    cta: 'START A LESSON',
  },
  {
    id: 'streak_freeze_day_3',
    subject: 'Final freeze day for your streak ⏳',
    body: 'You’ve used your 3-day freeze window. Complete a lesson today to protect your streak.',
    cta: 'START A LESSON',
  },
] as const;

export function streakReminderTemplate(freezeDay: 1 | 2 | 3) {
  return STREAK_REMINDER_TEMPLATES[freezeDay - 1];
}

export function streakReminderIdempotencyKey(userId: string, localDate: string) {
  return `streak-reminder/${userId}/${localDate}`;
}
