import { fireEvent, render, screen } from '@testing-library/react-native';

import { feedback } from '@/services/feedback';
import { WebInterstitialCard, WebProBanner } from '../web-ad-components';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('web Pro ad alternatives', () => {
  const feedbackPlay = jest.spyOn(feedback, 'play').mockImplementation(() => undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders a subscribe banner and opens the subscription screen', () => {
    render(<WebProBanner />);

    expect(screen.getByText('Subscribe to Pro')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Subscribe to Pro' }));

    expect(mockPush).toHaveBeenCalledWith('/subscription');
    expect(feedbackPlay).toHaveBeenCalledWith('buttonTap');
  });

  test('renders the web interstitial Pro offer', () => {
    render(<WebInterstitialCard />);

    expect(screen.getByLabelText('Subscribe to Pro offer')).toBeTruthy();
    expect(screen.getByText('Keep your learning streak uninterrupted')).toBeTruthy();
  });
});
