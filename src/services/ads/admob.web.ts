import { createElement } from 'react';

import { WebProBanner } from './web-ad-components';

export function initializeAdMob() {
  return Promise.resolve([]);
}

export function AdMobBanner() {
  return createElement(WebProBanner);
}

export function showInterstitialAd(): Promise<void> {
  return Promise.resolve();
}
