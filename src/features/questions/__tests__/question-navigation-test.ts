import { goBackOrReplace } from '@/navigation/go-back-or-replace';

const mockRouter = {
  back: jest.fn(),
  canGoBack: jest.fn(),
  replace: jest.fn(),
};

describe('question navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns to navigation history when it exists', () => {
    mockRouter.canGoBack.mockReturnValue(true);

    goBackOrReplace('/question-types', mockRouter);

    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  test('replaces with a stable route when opened directly', () => {
    mockRouter.canGoBack.mockReturnValue(false);

    goBackOrReplace('/question-types', mockRouter);

    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith('/question-types');
  });
});
