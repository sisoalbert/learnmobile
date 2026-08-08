import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { useReducedMotion, withRepeat } from 'react-native-reanimated';

import HomeScreen from '@/screens/HomeScreen';
import { useLearnerRewardsStore } from '@/state/learner-rewards-store';
import { useLearnerSessionStore } from '@/state/learner-session-store';

import { ComingSoonPathScreen } from '../coming-soon-path-screen';
import { LEARNING_PATHS_BY_LEVEL, isLearningPathLevel } from '../learning-paths';

const mockPush = jest.fn();
let mockQueryState: 'loading' | 'ready' | 'unavailable' = 'ready';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('expo-router', () => {
  const ReactModule = jest.requireActual('react');
  return {
    Link: ({ children, href }: { children: React.ReactElement; href: unknown }) =>
      ReactModule.cloneElement(children, { onPress: () => mockPush(href) }),
    useRouter: () => ({ push: mockPush }),
  };
});

jest.mock('convex/react', () => ({
  useConvexAuth: () => ({ isAuthenticated: false, isLoading: false }),
  useMutation: () => jest.fn(),
  useQuery: (_reference: unknown, args?: unknown) => {
    if (args === 'skip') return undefined;
    if (args === undefined && mockQueryState === 'loading') return undefined;
    if (args === undefined && mockQueryState === 'unavailable') return [];
    if (args && typeof args === 'object' && 'courseKey' in args) {
      return {
        id: 'course-1',
        key: 'beginner-course-1',
        title: 'Getting Started',
        description: 'Start',
        units: [{
          id: 'unit-1',
          key: 'beginner-course-1-core',
          title: 'Core lessons',
          order: 0,
          lessons: [
            { id: 'lesson-1', key: 'lesson-1', title: 'Meet Expo', order: 0, xpReward: 30 },
            { id: 'lesson-2', key: 'lesson-2', title: 'Start developing', order: 1, xpReward: 25 },
            { id: 'lesson-3', key: 'lesson-3', title: 'Project structure', order: 2, xpReward: 35 },
          ],
        }],
      };
    }
    if (args !== undefined) {
      return {
        progress: [{
          courseId: 'course-1',
          courseKey: 'beginner-course-1',
          currentLessonKey: 'lesson-2',
          status: 'in_progress',
          totalXp: 90,
          hearts: 4,
          completedLessons: 1,
        }],
        streakDays: 7,
        gems: 42,
      };
    }
    return [
      { id: 'course-1', key: 'beginner-course-1', title: 'Getting Started', description: 'Start', subject: 'Expo', order: 0, lessonCount: 3, exerciseCount: 6 },
      { id: 'course-5', key: 'beginner-course-5', title: 'Navigation Basics', description: 'Navigate', subject: 'Expo Router', order: 4, lessonCount: 3, exerciseCount: 6 },
    ];
  },
}));

describe('learning path MVP', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryState = 'ready';
    (useReducedMotion as jest.Mock).mockReturnValue(false);
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

  test('renders the current unit, counters, and lesson states on Home', () => {
    useLearnerSessionStore.setState({
      session: { learnerId: 'guest-test', credential: 'guest-credential' },
    });
    render(<HomeScreen />);

    expect(screen.getByText('Getting Started')).toBeTruthy();
    expect(screen.getByText('COURSE 1 · UNIT 1')).toBeTruthy();
    expect(screen.getByLabelText('7 day streak')).toBeTruthy();
    expect(screen.getByLabelText('90 total XP')).toBeTruthy();
    expect(screen.getByLabelText('4 hearts')).toBeTruthy();
    expect(screen.getByLabelText('Meet Expo, completed, 30 XP')).toBeEnabled();
    expect(screen.getByLabelText('Start developing, current, 25 XP')).toBeEnabled();
    expect(screen.getByLabelText('Project structure, locked, 35 XP')).toBeDisabled();
    expect(screen.getByText('CURRENT LESSON')).toBeTruthy();
    expect(screen.getByText('Start developing')).toBeTruthy();
    expect(screen.getByLabelText('Open Getting Started course overview')).toBeTruthy();
  });

  test('navigates the unit card and replayable lessons while locked lessons stay disabled', () => {
    useLearnerSessionStore.setState({
      session: { learnerId: 'guest-test', credential: 'guest-credential' },
    });
    render(<HomeScreen />);

    fireEvent.press(screen.getByLabelText('Open Getting Started course overview'));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/courses/[courseKey]',
      params: { courseKey: 'beginner-course-1' },
    });

    fireEvent.press(screen.getByLabelText('Meet Expo, completed, 30 XP'));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/lessons/[lessonKey]',
      params: { lessonKey: 'lesson-1' },
    });

    fireEvent.press(screen.getByLabelText('Start developing, current, 25 XP'));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/lessons/[lessonKey]',
      params: { lessonKey: 'lesson-2' },
    });

    const callsBeforeLockedPress = mockPush.mock.calls.length;
    fireEvent.press(screen.getByLabelText('Project structure, locked, 35 XP'));
    expect(mockPush).toHaveBeenCalledTimes(callsBeforeLockedPress);
  });

  test('renders loading and unavailable states', () => {
    useLearnerSessionStore.setState({
      session: { learnerId: 'guest-test', credential: 'guest-credential' },
    });
    mockQueryState = 'loading';
    const loading = render(<HomeScreen />);
    expect(screen.getByText('Restoring your learning path…')).toBeTruthy();
    loading.unmount();

    mockQueryState = 'unavailable';
    render(<HomeScreen />);
    expect(screen.getByText('Your learning path is not available yet.')).toBeTruthy();
  });

  test('does not start repeating ring motion when reduced motion is enabled', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(true);
    useLearnerSessionStore.setState({
      session: { learnerId: 'guest-test', credential: 'guest-credential' },
    });

    render(<HomeScreen />);

    expect(withRepeat).not.toHaveBeenCalled();
    expect(screen.getByText('CURRENT LESSON')).toBeTruthy();
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

    await waitFor(() => expect(useLearnerRewardsStore.getState().gems).toBe(42));
  });
});
