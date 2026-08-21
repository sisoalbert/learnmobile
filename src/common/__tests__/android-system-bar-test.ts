import { getAndroidStatusBarTheme } from '../android-system-bar';

describe('Android system bar theme', () => {
  test('uses dark icons over the light safe-area surface', () => {
    expect(getAndroidStatusBarTheme('light')).toEqual({
      backgroundColor: '#F8FAFD',
      style: 'dark',
    });
  });

  test('uses light icons over the dark safe-area surface', () => {
    expect(getAndroidStatusBarTheme('dark')).toEqual({
      backgroundColor: '#111827',
      style: 'light',
    });
  });
});
