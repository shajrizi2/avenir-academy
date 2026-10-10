'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/** False during server rendering and hydration, true once React runs on the client. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
