'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { denyGtag, GA_ID, initGtag } from '@/lib/analytics';
import { setConsent, useConsent } from '@/lib/consent';

export interface ConsentCopy {
  label: string;
  text: string;
  accept: string;
  decline: string;
}

/**
 * Google Analytics behind a consent banner. Nothing loads, and no cookie is set, until the
 * visitor accepts. Renders nothing at all when NEXT_PUBLIC_GA_ID is unset.
 */
export function Analytics({ copy }: { copy: ConsentCopy }) {
  const consent = useConsent();

  useEffect(() => {
    if (!GA_ID) return;
    if (consent === 'granted') initGtag(GA_ID);
    if (consent === 'denied') denyGtag();
  }, [consent]);

  if (!GA_ID) return null;
  if (consent === 'granted') {
    return (
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`}
        strategy="afterInteractive"
      />
    );
  }
  if (consent !== null) return null;

  return (
    <section
      aria-label={copy.label}
      className="border-ink bg-background rounded-card fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl border-2 p-5 shadow-[0_4px_0_var(--ink)] sm:p-6"
    >
      <p className="text-ink text-sm sm:text-base">{copy.text}</p>
      {/* Both choices get the same weight: declining must be as easy as accepting. */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button variant="chunky-outline" onClick={() => setConsent('denied')}>
          {copy.decline}
        </Button>
        <Button variant="chunky" onClick={() => setConsent('granted')}>
          {copy.accept}
        </Button>
      </div>
    </section>
  );
}

/** A footer link that forgets the choice, so the banner asks again. */
export function CookieSettingsButton({ label, className }: { label: string; className?: string }) {
  if (!GA_ID) return null;
  return (
    <button type="button" className={className} onClick={() => setConsent(null)}>
      {label}
    </button>
  );
}
