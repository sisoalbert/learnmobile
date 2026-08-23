import { render, screen } from '@testing-library/react-native';

import { useLearnerSessionStore } from '@/state/learner-session-store';
import { useLessonResultsStore } from '@/state/lesson-results-store';
import CalendarScreen from '../calendar-screen';

let mockLoading = false;

jest.mock('convex/react', () => ({
  useConvexAuth: () => ({ isAuthenticated: false, isLoading: false }),
  useQuery: (_reference: unknown, args: unknown) => {
    if (args === 'skip' || mockLoading) return undefined;
    return {
      monthlyActivityDateKeys: ['2026-08-05', '2026-08-06'],
      progress: [{ lastPracticeDate: '2026-08-07' }],
      streakDays: 3,
      gems: 0,
    };
  },
}));

describe('Calendar screen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-06T12:00:00Z'));
    mockLoading = false;
    useLearnerSessionStore.setState({
      hasHydrated: true,
      session: { learnerId: 'guest-test', credential: 'guest-credential' },
    });
    useLessonResultsStore.setState({ latestSummary: null });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders the current month with real practice dates', () => {
    render(<CalendarScreen />);

    expect(screen.getByText('August')).toBeTruthy();
    expect(screen.getByLabelText('3 practice days this month')).toBeTruthy();
    expect(screen.getByLabelText('August practice calendar, 6 weeks')).toBeTruthy();
    expect(screen.getAllByLabelText(/Week \d of 6/)).toHaveLength(6);
    expect(screen.getByLabelText('Wednesday, August 5, completed')).toBeTruthy();
    expect(screen.getByLabelText('Thursday, August 6, completed, today')).toBeTruthy();
    expect(screen.getByLabelText('Monday, July 27, outside August')).toBeTruthy();
    expect(screen.getByTestId('calendar-safe-area')).toHaveProp('edges', expect.objectContaining({ top: 'additive' }));
  });

  test('shows a loading state while activity restores', () => {
    mockLoading = true;

    render(<CalendarScreen />);

    expect(screen.getByText('Restoring your practice calendar…')).toBeTruthy();
    expect(screen.getByTestId('calendar-safe-area')).toHaveProp('edges', expect.objectContaining({ top: 'additive' }));
  });
});
