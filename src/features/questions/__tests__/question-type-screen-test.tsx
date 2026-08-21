import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Keyboard, Platform } from 'react-native';

import { feedback } from '@/services/feedback';
import { useSessionStore } from '@/state/sessionStore';
import { QUESTION_INPUT_ACCESSORY_ID } from '../question-constants';
import { QUESTION_FIXTURES_BY_TYPE } from '../question-fixtures';
import { QuestionTypeScreen } from '../question-type-screen';
import { parseTemplateLines } from '../question-ui';

let mockInLessonAdsEnabled: boolean | undefined = true;

jest.mock('@/services/ads', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    AdMobBanner: () => React.createElement(View, { accessibilityLabel: 'Test AdMob banner' }),
    useInLessonAdsEnabled: () => mockInLessonAdsEnabled,
  };
});

describe('QuestionTypeScreen', () => {
  const feedbackPlay = jest.spyOn(feedback, 'play').mockImplementation(() => undefined);

  beforeEach(() => {
    feedbackPlay.mockClear();
    mockInLessonAdsEnabled = true;
    useSessionStore.getState().signOut();
  });

  test('renders a banner for free learners', () => {
    render(<QuestionTypeScreen question={QUESTION_FIXTURES_BY_TYPE.multiple_choice} showInLessonAd />);

    expect(screen.getByLabelText('Test AdMob banner')).toBeTruthy();
  });

  test('hides the banner for premium learners', () => {
    useSessionStore.getState().setAuthenticatedUser({ id: 'premium-user', plan: 'premium' });
    render(<QuestionTypeScreen question={QUESTION_FIXTURES_BY_TYPE.multiple_choice} showInLessonAd />);

    expect(screen.queryByLabelText('Test AdMob banner')).toBeNull();
  });

  test.each([false, undefined])('hides the native banner when the mobile ads flag is %s', (enabled) => {
    mockInLessonAdsEnabled = enabled;
    render(<QuestionTypeScreen question={QUESTION_FIXTURES_BY_TYPE.multiple_choice} showInLessonAd />);

    expect(screen.queryByLabelText('Test AdMob banner')).toBeNull();
  });

  test('does not render a native banner without explicit lesson eligibility', () => {
    render(<QuestionTypeScreen question={QUESTION_FIXTURES_BY_TYPE.multiple_choice} />);

    expect(screen.queryByLabelText('Test AdMob banner')).toBeNull();
  });

  test('preserves code lines and keeps blanks within their source line', () => {
    expect(parseTemplateLines('return (\n  <Text>{{message}}</Text>\n);')).toEqual([
      [{ type: 'text', value: 'return (' }],
      [
        { type: 'text', value: '  <Text>' },
        { type: 'blank', id: 'message' },
        { type: 'text', value: '</Text>' },
      ],
      [{ type: 'text', value: ');' }],
    ]);
  });

  test('accepts an inline code blank and enables grading', () => {
    render(<QuestionTypeScreen question={QUESTION_FIXTURES_BY_TYPE.complete_code} />);

    expect(screen.getByText('Check answer')).toBeDisabled();
    fireEvent.changeText(screen.getByLabelText('Answer for message'), 'Hello Expo!');
    expect(screen.getByText('Check answer')).toBeEnabled();
  });

  test('keeps keyboard controls available for the code editor', () => {
    const dismissKeyboard = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => undefined);
    render(<QuestionTypeScreen question={QUESTION_FIXTURES_BY_TYPE.build_and_render} />);

    expect(screen.getByLabelText('Question content')).toHaveProp(
      'keyboardDismissMode',
      Platform.OS === 'ios' ? 'interactive' : 'on-drag',
    );
    expect(screen.getByLabelText('Code editor for App.tsx')).toHaveProp(
      'inputAccessoryViewID',
      QUESTION_INPUT_ACCESSORY_ID,
    );
    expect(screen.getByLabelText('Code editor for App.tsx')).toHaveProp(
      'keyboardType',
      Platform.OS === 'ios' ? 'ascii-capable' : 'default',
    );

    if (Platform.OS === 'ios') {
      fireEvent.press(screen.getByLabelText('Dismiss keyboard'));
      expect(dismissKeyboard).toHaveBeenCalled();
    }
    dismissKeyboard.mockRestore();
  });

  test('adds builder blocks without nesting the slot and row actions', () => {
    render(<QuestionTypeScreen question={QUESTION_FIXTURES_BY_TYPE.drag_drop_builder} />);

    expect(screen.getByLabelText('Builder slot layout')).toBeDisabled();
    fireEvent.press(screen.getByText('<View>'));
    fireEvent.press(screen.getByLabelText('Add <View> to builder slot layout'));

    expect(screen.getByLabelText('Remove block')).toBeTruthy();
    expect(screen.getByLabelText('Builder slot layout')).toBeDisabled();
  });

  test('answers, grades, explains, and continues a question', () => {
    const onContinue = jest.fn();
    render(<QuestionTypeScreen question={QUESTION_FIXTURES_BY_TYPE.multiple_choice} onContinue={onContinue} />);

    expect(screen.getByText('Check answer')).toBeDisabled();
    fireEvent.press(screen.getByText('Act as a container for layouts'));
    fireEvent.press(screen.getByText('Check answer'));

    expect(screen.getByText('Excellent!')).toBeTruthy();
    expect(screen.getByText('Why?')).toBeTruthy();
    fireEvent.press(screen.getByText('Continue'));
    expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({ status: 'correct' }));
    expect(feedbackPlay).toHaveBeenCalledWith('correctAnswer');
    expect(feedbackPlay).toHaveBeenCalledWith('buttonTap');
  });

  test('exposes capped lesson progress to assistive technology', () => {
    render(
      <QuestionTypeScreen
        question={QUESTION_FIXTURES_BY_TYPE.multiple_choice}
        sequence={{ index: 2, total: 2 }}
      />,
    );

    expect(screen.getByLabelText('2 of 2')).toHaveProp('accessibilityValue', {
      min: 0,
      max: 100,
      now: 90,
      text: '90% complete',
    });
  });

  test('reveals hints and lets an incorrect learner retry', () => {
    const dismissKeyboard = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => undefined);
    render(<QuestionTypeScreen question={QUESTION_FIXTURES_BY_TYPE.multiple_choice} />);
    fireEvent.press(screen.getByText('Show a hint'));
    expect(screen.getByText(/Think about the role/)).toBeTruthy();
    fireEvent.press(screen.getByText('Display text'));
    fireEvent.press(screen.getByText('Check answer'));
    expect(screen.getByText('Not quite yet')).toBeTruthy();
    expect(feedbackPlay).toHaveBeenCalledWith('incorrectAnswer');
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.queryByText('Not quite yet')).toBeNull();
    expect(dismissKeyboard).toHaveBeenCalledTimes(2);
    dismissKeyboard.mockRestore();
  });

  test('initializes an ordering question as a complete, incorrect permutation', () => {
    render(<QuestionTypeScreen question={QUESTION_FIXTURES_BY_TYPE.arrange_in_order} />);

    expect(screen.getByRole('button', { name: 'Check answer' })).toBeEnabled();
    expect(screen.getAllByLabelText('Move up')[0]).toBeDisabled();
    expect(screen.getAllByLabelText('Move down')[0]).toBeEnabled();
  });
});
