export function resolveMobileAdsFlags({
  legacy,
  inLesson,
  endOfLesson,
}: {
  legacy?: boolean;
  inLesson?: boolean;
  endOfLesson?: boolean;
}) {
  return {
    inLesson: inLesson ?? legacy ?? false,
    endOfLesson: endOfLesson ?? legacy ?? false,
  };
}
