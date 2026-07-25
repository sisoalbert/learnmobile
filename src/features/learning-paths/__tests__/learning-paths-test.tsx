import { render, screen } from '@testing-library/react-native';
import React from 'react';

import HomeScreen from '@/screens/HomeScreen';

import { ComingSoonPathScreen } from '../coming-soon-path-screen';
import { LEARNING_PATHS_BY_LEVEL, isLearningPathLevel } from '../learning-paths';

describe('learning path MVP', () => {
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
    expect(screen.getByText('12%')).toBeTruthy();
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
});
