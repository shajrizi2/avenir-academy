'use client';

import { useSyncExternalStore } from 'react';

const TICK_MS = 15_000;

function subscribe(onTick: () => void): () => void {
  const id = setInterval(onTick, TICK_MS);
  return () => clearInterval(id);
}

// Rounded to the tick so the snapshot stays stable between renders.
const getSnapshot = () => Math.floor(Date.now() / TICK_MS) * TICK_MS;
const getServerSnapshot = () => 0;

/**
 * The current time in ms, updated every 15 seconds on the client. Returns 0 during server
 * rendering and hydration, so callers can render a neutral state until the clock is known.
 */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ---- A one-second clock for countdowns (the test timer) ----

function subscribeSeconds(onTick: () => void): () => void {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}

const getSecondsSnapshot = () => Math.floor(Date.now() / 1000) * 1000;

/** Like useNow(), but ticks every second. Use it only where a visible countdown needs it. */
export function useNowEverySecond(): number {
  return useSyncExternalStore(subscribeSeconds, getSecondsSnapshot, getServerSnapshot);
}
