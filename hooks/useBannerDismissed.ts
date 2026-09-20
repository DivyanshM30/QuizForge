'use client';

import { useSyncExternalStore } from 'react';

const KEY = 'features-banner-dismissed';
const EVENT = 'quizforge-banner-dismissed';
let dismissedInTab = false;
function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(EVENT, onChange);
  };
}
function getSnapshot() {
  try { return dismissedInTab || Boolean(localStorage.getItem(KEY)); } catch { return dismissedInTab; }
}

export function useBannerDismissed() {
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, () => true);
  return { dismissed, dismiss: () => {
    dismissedInTab = true;
    try { localStorage.setItem(KEY, '1'); } catch { /* Storage may be unavailable. */ }
    window.dispatchEvent(new Event(EVENT));
  } };
}
