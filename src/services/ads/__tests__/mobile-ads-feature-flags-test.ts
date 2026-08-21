import { resolveMobileAdsFlags } from '../../../../convex/mobileAdFlags';

describe('mobile ad flag compatibility', () => {
  test('defaults both placements to disabled', () => {
    expect(resolveMobileAdsFlags({})).toEqual({ inLesson: false, endOfLesson: false });
  });

  test('inherits the legacy global value for unset placement flags', () => {
    expect(resolveMobileAdsFlags({ legacy: true })).toEqual({
      inLesson: true,
      endOfLesson: true,
    });
  });

  test('lets each placement override the legacy value independently', () => {
    expect(resolveMobileAdsFlags({ legacy: true, inLesson: false })).toEqual({
      inLesson: false,
      endOfLesson: true,
    });
    expect(resolveMobileAdsFlags({ legacy: false, endOfLesson: true })).toEqual({
      inLesson: false,
      endOfLesson: true,
    });
  });
});
