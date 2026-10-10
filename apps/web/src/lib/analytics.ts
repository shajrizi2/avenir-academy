/**
 * Analytics: Google Analytics 4, loaded only after the visitor accepts (see
 * components/analytics/analytics.tsx) and only when NEXT_PUBLIC_GA_ID is set. Every CTA
 * calls `track()`; before consent it does nothing. Keep event names snake_case and stable.
 */
export type AnalyticsProps = Record<string, string | number | boolean>;

/** GA4 measurement ID (G-XXXXXXX). Unset = no analytics and no cookie banner. */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? '';

type Gtag = (...args: unknown[]) => void;

function gtag(): Gtag | undefined {
  return typeof window === 'undefined' ? undefined : (window as unknown as { gtag?: Gtag }).gtag;
}

export function track(event: string, props: AnalyticsProps = {}): void {
  if (process.env.NODE_ENV === 'development') {
    console.debug('[analytics]', event, props);
  }
  gtag()?.('event', event, props);
}

/** Sets up `window.gtag` and queues the GA4 config; gtag.js picks the queue up when it loads. */
export function initGtag(measurementId: string): void {
  const w = window as unknown as { dataLayer?: unknown[]; gtag?: Gtag };
  if (w.gtag) {
    w.gtag('consent', 'update', { analytics_storage: 'granted' });
    return;
  }
  w.dataLayer = w.dataLayer ?? [];
  // gtag.js expects the `arguments` object itself, not an array.
  w.gtag = function gtagShim() {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer?.push(arguments);
  };
  w.gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  w.gtag('js', new Date());
  w.gtag('config', measurementId);
}

/** Stops GA from storing anything for the rest of this page's life after a "no". */
export function denyGtag(): void {
  gtag()?.('consent', 'update', { analytics_storage: 'denied' });
}
