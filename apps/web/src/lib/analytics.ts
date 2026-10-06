/**
 * Analytics seam. Every CTA click calls `track()`; it is a no-op until a provider
 * (GA4, Plausible, …) is plugged in here. Keep event names snake_case and stable.
 */
export type AnalyticsProps = Record<string, string | number | boolean>;

export function track(event: string, props: AnalyticsProps = {}): void {
  if (process.env.NODE_ENV === 'development') {
    console.debug('[analytics]', event, props);
  }
  // Provider goes here, e.g. window.plausible?.(event, { props }).
}
