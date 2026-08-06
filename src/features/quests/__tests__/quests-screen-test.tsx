import { render, screen } from '@testing-library/react-native';

import { useLearnerSessionStore } from '@/state/learner-session-store';
import { useLessonResultsStore } from '@/state/lesson-results-store';
import QuestsScreen from '../quests-screen';

let mockLoading = false;
let mockHasMonthlyQuest = true;

jest.mock('convex/react', () => ({
  useConvexAuth: () => ({ isAuthenticated: false, isLoading: false }),
  useQuery: (_reference: unknown, args: unknown) => {
    if (args === 'skip' || mockLoading) return undefined;
    return {
      progress: [],
      streakDays: 2,
      gems: 24,
      monthlyQuest: mockHasMonthlyQuest ? {
        monthKey: '2026-08',
        questPoints: 3,
        questTarget: 30,
        lessonsCompleted: 3,
        lessonsTarget: 2,
        highAccuracyLessons: 3,
        highAccuracyTarget: 3,
        streakExtensions: 2,
        streakTarget: 1,
      } : undefined,
    };
  },
}));

describe('Quests screen', () => {
  beforeEach(() => {
    mockLoading = false;
    mockHasMonthlyQuest = true;
    useLearnerSessionStore.setState({
      hasHydrated: true,
      session: { learnerId: 'guest-test', credential: 'guest-credential' },
    });
    useLessonResultsStore.setState({ latestSummary: null });
  });

  test('shows authoritative monthly quest progress', () => {
    render(<QuestsScreen />);

    expect(screen.getAllByText('August Quest')).toHaveLength(2);
    expect(screen.getByLabelText('3 of 30 quest points')).toBeTruthy();
    expect(screen.getByLabelText('Extend your streak, 2 of 1')).toBeTruthy();
    expect(screen.getByLabelText('Complete 2 lessons, 3 of 2')).toBeTruthy();
    expect(screen.getByLabelText('Score 80% in 3 lessons, 3 of 3')).toBeTruthy();
    expect(screen.getByLabelText('Extend your streak progress')).toBeTruthy();
    expect(screen.getByLabelText('August Quest progress')).toBeTruthy();
    expect(screen.getByText('Every lesson counts')).toBeTruthy();
  });

  test('shows a loading state while quest progress restores', () => {
    mockLoading = true;

    render(<QuestsScreen />);

    expect(screen.getByText('Restoring your quests…')).toBeTruthy();
  });

  test('uses a safe zero state before the backend adds quest progress', () => {
    mockHasMonthlyQuest = false;

    render(<QuestsScreen />);

    expect(screen.getByLabelText('0 of 30 quest points')).toBeTruthy();
    expect(screen.getByLabelText('Extend your streak, 0 of 1')).toBeTruthy();
  });
});
