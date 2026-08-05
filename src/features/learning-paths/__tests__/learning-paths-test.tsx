import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import HomeScreen from '@/screens/HomeScreen';
import { useLearnerRewardsStore } from '@/state/learner-rewards-store';
import { useLearnerSessionStore } from '@/state/learner-session-store';

import { ComingSoonPathScreen } from '../coming-soon-path-screen';
import { LEARNING_PATHS_BY_LEVEL, isLearningPathLevel } from '../learning-paths';

jest.mock('convex/react', () => ({
  useConvexAuth: () => ({ isAuthenticated: false, isLoading: false }),
  useQuery: (_reference: unknown, args?: unknown) => {
    if (args === 'skip') return undefined;
    if (args !== undefined) return { progress: [], streakDays: 1, gems: 42 };
    return [
      { id: 'course-1', key: 'beginner-course-1', title: 'Getting Started', description: 'Start', subject: 'Expo', lessonCount: 3, exerciseCount: 6 },
      { id: 'course-5', key: 'beginner-course-5', title: 'Navigation Basics', description: 'Navigate', subject: 'Expo Router', lessonCount: 3, exerciseCount: 6 },
    ];
  },
}));

describe('learning path MVP', () => {
  beforeEach(() => {
    useLearnerRewardsStore.getState().resetRewards();
    useLearnerSessionStore.setState({ hasHydrated: true, session: null });
  });

  test('ships Beginner and keeps the later paths locked', () => {
    expect(LEARNING_PATHS_BY_LEVEL.beginner).toMatchObject({ status: 'available', progress: 0.12 });
    expect(LEARNING_PATHS_BY_LEVEL.beginner.status === 'available' && LEARNING_PATHS_BY_LEVEL.beginner.courses).toHaveLength(5);
    expect(LEARNING_PATHS_BY_LEVEL.intermediate.status).toBe('coming_soon');
    expect(LEARNING_PATHS_BY_LEVEL.advanced.status).toBe('coming_soon');
    expect(isLearningPathLevel('intermediate')).toBe(true);
    expect(isLearningPathLevel('expert')).toBe(false);
  });

  test('renders the complete learning path overview on Home', () => {
    render(<HomeScreen />);

    expect(screen.getByText('Learning Paths')).toBeTruthy();
    expect(screen.getByText('Getting Started')).toBeTruthy();
    expect(screen.getByText('Navigation Basics')).toBeTruthy();
    expect(screen.getByText('Syncing your progress…')).toBeTruthy();
    expect(screen.getAllByText('COMING SOON')).toHaveLength(2);
  });

  test('shows the locked path roadmap', () => {
    const path = LEARNING_PATHS_BY_LEVEL.intermediate;
    if (path.status !== 'coming_soon') throw new Error('Intermediate must stay locked for the MVP');

    render(<ComingSoonPathScreen path={path} />);

    expect(screen.getByText('Build complete real-world mobile apps.')).toBeTruthy();
    expect(screen.getByText('APIs')).toBeTruthy();
    expect(screen.getByText('Convex Backend')).toBeTruthy();
    expect(screen.getByText('Coming in a future update.')).toBeTruthy();
  });

  test('hydrates the rewards cache from authoritative guest progress', async () => {
    useLearnerSessionStore.setState({
      session: { learnerId: 'guest-test', credential: 'guest-credential' },
    });

    render(<HomeScreen />);

    expect(screen.getByLabelText('42 gems')).toBeTruthy();
    await waitFor(() => expect(useLearnerRewardsStore.getState().gems).toBe(42));
  });
});
