import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Audience } from '@/components/landing/audience';
import { Benefits } from '@/components/landing/benefits';
import { Cohort } from '@/components/landing/cohort';
import { Faq } from '@/components/landing/faq';
import { FinalCta } from '@/components/landing/final-cta';
import { Hero } from '@/components/landing/hero';
import { HowItWorks } from '@/components/landing/how-it-works';
import { Instructors } from '@/components/landing/instructors';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingHeader } from '@/components/landing/landing-header';
import { MobileCtaBar } from '@/components/landing/mobile-cta-bar';
import { SocialProof } from '@/components/landing/social-proof';
import { Testimonials } from '@/components/landing/testimonials';
import { Tracks } from '@/components/landing/tracks';
import { WhyNow } from '@/components/landing/why-now';
import { OG_LOCALE } from '@/i18n/format';
import { getLandingMessages } from '@/i18n/server';
import { SITE_NAME } from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getLandingMessages();
  return {
    title: { absolute: t.meta.title },
    description: t.meta.description,
    alternates: {
      canonical: `/${locale}`,
      languages: { sq: '/sq', en: '/en', 'x-default': '/sq' },
    },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: t.meta.title,
      description: t.meta.description,
      url: `/${locale}`,
      locale: OG_LOCALE[locale],
      alternateLocale: Object.values(OG_LOCALE).filter((l) => l !== OG_LOCALE[locale]),
    },
    twitter: { card: 'summary_large_image', title: t.meta.title, description: t.meta.description },
  };
}

/** Marketing landing page. Its one job: turn a visitor into a registration. */
export default async function LandingPage() {
  const { locale, t } = await getLandingMessages();
  return (
    <>
      <a
        href="#main"
        className="text-ink bg-background sr-only z-50 rounded-lg px-4 py-2 font-semibold shadow focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t.skipLink}
      </a>
      <LandingHeader locale={locale} nav={t.nav} />
      <main id="main" className="flex-1">
        <Hero />
        <SocialProof />
        <WhyNow />
        <HowItWorks />
        <Tracks />
        <Audience />
        <Benefits />
        <Suspense>
          <Instructors />
        </Suspense>
        <Suspense>
          <Testimonials />
        </Suspense>
        <Cohort />
        <Faq />
        <FinalCta />
      </main>
      {/* Bottom padding keeps the footer clear of the mobile CTA bar. */}
      <div className="pb-20 md:pb-0">
        <LandingFooter />
      </div>
      <MobileCtaBar locale={locale} label={t.mobileBar.cta} />
    </>
  );
}
