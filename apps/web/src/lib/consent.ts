'use client';

import { useSyncExternalStore } from 'react';

/** The visitor's analytics choice. `null` = not asked yet; `undefined` = not known yet (SSR). */
export type Consent = 'granted' | 'denied' | null | undefined;

const KEY = 'aa_consent';
const listeners = new Set<() => void>();

function read(): Consent {
  try {
    const value = window.localStorage.getItem(KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    // Storage blocked (private mode, strict settings): ask again on every visit.
    return null;
  }
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** The current choice; `undefined` during server rendering and hydration. */
export function useConsent(): Consent {
  return useSyncExternalStore(subscribe, read, () => undefined);
}

/** Saves the choice (`null` forgets it, so the banner asks again). */
export function setConsent(value: 'granted' | 'denied' | null): void {
  try {
    if (value) window.localStorage.setItem(KEY, value);
    else window.localStorage.removeItem(KEY);
  } catch {
    // See read().
  }
  listeners.forEach((listener) => listener());
}
