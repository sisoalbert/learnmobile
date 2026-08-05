export const MAX_QUESTION_PROGRESS_PERCENT = 90;

export function getLessonQuestionProgressPercent(index: number, total: number) {
  if (!Number.isFinite(index) || !Number.isFinite(total) || total <= 0) return 0;

  const positionPercent = Math.round((Math.max(0, Math.min(index, total)) / total) * 100);
  return Math.min(MAX_QUESTION_PROGRESS_PERCENT, positionPercent);
}
